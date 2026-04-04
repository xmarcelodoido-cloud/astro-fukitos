import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ECLIPSE_API = "https://edusp.crimsonzerohub.xyz";
const EDUSP_API = "https://edusp-api.ip.tv";
const SED_LOGIN_PROXY = "https://taskitos.cupiditys.lol";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

function randomHex(len: number): string {
  const arr = new Uint8Array(len / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function eduspHeaders(token?: string) {
  const reqId = randomHex(32);
  const traceId = randomHex(16);
  const h: Record<string, string> = {
    "Accept": "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    "Request-Id": `|${reqId}.${traceId}`,
    "Traceparent": `00-${reqId}-${traceId}-01`,
    "X-Api-Realm": "edusp",
    "X-Api-Platform": "webclient",
    "User-Agent": USER_AGENT,
    "origin": "https://saladofuturo.educacao.sp.gov.br",
    "referer": "https://saladofuturo.educacao.sp.gov.br/",
  };
  if (token) h["x-api-key"] = token;
  return h;
}

async function pollJob(jobId: string, token: string, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${ECLIPSE_API}/job/${jobId}`, {
      method: "GET",
      headers: { "x-api-key": token, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Job poll failed: ${res.status} - ${err}`);
    }

    const data = await res.json();
    const status = (data.status || "").toLowerCase();

    if (status === "concluido" || status === "sucesso" || status === "completed" || status === "success") {
      return data;
    }
    if (status === "erro" || status === "error" || status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(data)}`);
    }

    // Wait 2 seconds before next poll
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Job polling timeout");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    let result: any;

    switch (action) {
      case "login": {
        // Step 1: Login via SED integracoes (like Taskitos)
        const sedRes = await fetch(
          `${SED_LOGIN_PROXY}/p/https://sedintegracoes.educacao.sp.gov.br/saladofuturobffapi/credenciais/api/LoginCompletoToken`,
          {
            method: "POST",
            headers: {
              "Accept": "*/*",
              "Accept-Language": "pt-BR,pt;q=0.5",
              "Content-Type": "application/json",
              "ocp-apim-subscription-key": "d701a2043aa24d7ebb37e9adf60d043b",
            },
            body: JSON.stringify({
              user: payload.ra,
              senha: payload.password,
            }),
          }
        );

        if (!sedRes.ok) {
          const err = await sedRes.text();
          if (err.toLowerCase().includes("invalid") || err.toLowerCase().includes("incorretos")) {
            throw new Error("RA ou senha inválidos");
          }
          throw new Error(`Login failed: ${sedRes.status} - ${err}`);
        }

        const sedData = await sedRes.json();

        // Step 2: Exchange token via edusp
        const tokenRes = await fetch(`${EDUSP_API}/registration/edusp/token`, {
          method: "POST",
          headers: eduspHeaders(),
          body: JSON.stringify({ token: sedData.token }),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.text();
          throw new Error(`Token exchange failed: ${tokenRes.status} - ${err}`);
        }

        result = await tokenRes.json();
        break;
      }

      case "rooms": {
        const res = await fetch(
          `${EDUSP_API}/room/user?list_all=true&with_cards=true`,
          { method: "GET", headers: eduspHeaders(payload.token) }
        );
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Rooms failed: ${res.status} - ${err}`);
        }
        result = await res.json();
        break;
      }

      case "tasks": {
        const { token, filter, targets, roomCode } = payload;

        // Get room detail for category groups
        let categoryTargets: string[] = [];
        if (roomCode) {
          try {
            const detailRes = await fetch(
              `${EDUSP_API}/room/detail/${roomCode}?fields[]=id&fields[]=name&with_category_groups=true`,
              { method: "GET", headers: eduspHeaders(token) }
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.group_categories) {
                categoryTargets = detailData.group_categories.map((c: any) => c.id);
              }
            }
          } catch (e) {
            console.log("[tasks] Failed to get room detail:", e);
          }
        }

        const isExpired = filter === "expired";

        // Use Eclipse Lunar API for fetching tasks
        let url = `${ECLIPSE_API}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=${isExpired}&filter_expired=${!isExpired}&is_exam=false&is_essay=false`;

        // Add publication targets
        for (const t of (targets || [])) {
          url += `&publication_target=${encodeURIComponent(t)}`;
        }
        for (const ct of categoryTargets) {
          url += `&publication_target=${encodeURIComponent(ct)}`;
        }

        url += "&answer_statuses=pending&answer_statuses=draft";

        const res = await fetch(url, {
          method: "GET",
          headers: eduspHeaders(token),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Tasks failed: ${res.status} - ${err}`);
        }
        result = await res.json();
        break;
      }

      case "complete": {
        const { taskData, token, roomCode, isDraft, minTime, maxTime, score, userNick } = payload;
        const taskId = taskData.id;

        console.log(`[complete] task_id=${taskId}, room=${roomCode}, draft=${isDraft}`);

        // Skip essays and exams
        if (taskData.is_essay) {
          result = { success: true, skipped: true, reason: "essay", _taskId: taskId };
          break;
        }
        if (taskData.is_exam) {
          result = { success: true, skipped: true, reason: "exam", _taskId: taskId };
          break;
        }

        // Submit to Eclipse Lunar /complete
        const completePayload = {
          task_id: taskId,
          score: score || 100,
          user_nick: userNick || "",
        };

        console.log(`[complete] Sending to Eclipse Lunar: task_id=${taskId}, score=${score}`);

        const completeRes = await fetch(`${ECLIPSE_API}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": token,
          },
          body: JSON.stringify(completePayload),
        });

        const responseText = await completeRes.text();
        console.log(`[complete] Eclipse response: status=${completeRes.status}, body=${responseText.substring(0, 500)}`);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new Error(`Eclipse response not JSON: ${completeRes.status} - ${responseText}`);
        }

        // If response contains a job ID, poll for completion
        const jobId = responseData.job_id || responseData.jobId || responseData.id;
        if (jobId) {
          console.log(`[complete] Polling job: ${jobId}`);
          try {
            const jobResult = await pollJob(jobId, token);
            result = { success: true, ...jobResult, _taskId: taskId };
          } catch (e) {
            result = { success: false, error: e.message, _taskId: taskId };
          }
        } else if (responseData.status === "success" || responseData.success) {
          result = { success: true, ...responseData, _taskId: taskId };
        } else {
          result = { success: false, ...responseData, _taskId: taskId };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[proxy-catalyst] Error: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
