import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ECLIPSE_API = "https://edusp.crimsonzerohub.xyz";
const CATALYST_API = "https://catalyst.crimsonzerohub.xyz";
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

function parseEstimatedMinutes(message: string | undefined): number {
  if (!message) return 2;
  const m = message.match(/~?\s*(\d+)\s*min/i);
  if (m) return Math.max(1, parseInt(m[1]));
  const s = message.match(/~?\s*(\d+)\s*s(?:ec)?/i);
  if (s) return Math.max(1, Math.ceil(parseInt(s[1]) / 60));
  return 2;
}

async function pollJob(jobId: string, token: string, taskId: string, isExpired: boolean, targets: string[], maxAttempts = 90): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${ECLIPSE_API}/job/${jobId}`, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "x-api-key": token,
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
          "origin": "https://saladofuturo.educacao.sp.gov.br",
          "referer": "https://saladofuturo.educacao.sp.gov.br/",
        },
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn(`[pollJob] HTTP ${res.status}: ${err}`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      const data = await res.json();
      const status = (data.status || "").toLowerCase();

      if (status === "erro" || status === "error" || status === "failed") {
        throw new Error(`Job failed: ${data.message || JSON.stringify(data)}`);
      }

      if (status === "concluido" || status === "completed" || status === "success") {
        // Verify task status on EDUSP
        const verified = await verifyTaskCompletion(token, taskId, isExpired, targets);
        return { ...data, verified, _taskId: taskId };
      }

      // status === 'pendente' — still processing
      console.log(`[pollJob] Job ${jobId} pending, waiting...`);
    } catch (err) {
      console.warn(`[pollJob] Error polling job ${jobId}:`, err);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Job polling timeout");
}

async function verifyTaskCompletion(token: string, taskId: string, isExpired: boolean, targets: string[]): Promise<boolean> {
  try {
    const tStr = targets.map(t => `publication_target=${encodeURIComponent(t)}`).join("&");
    const url = `${ECLIPSE_API}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=${isExpired}&filter_expired=${!isExpired}&is_exam=false&is_essay=false&${tStr}`;
    
    const res = await fetch(url, { method: "GET", headers: eduspHeaders(token) });
    if (!res.ok) return false;
    
    const items = await res.json();
    const arr = Array.isArray(items) ? items : [];
    const found = arr.find((t: any) => String(t.id) === String(taskId));
    
    // For pending: task disappeared = delivered successfully
    if (!isExpired && !found) return true;
    // For expired: has draft = saved
    if (isExpired && found && (found.answer_status === "draft" || found.answer_id)) return true;
    
    return false;
  } catch {
    return false;
  }
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
            body: JSON.stringify({ user: payload.ra, senha: payload.password }),
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

        const tokenRes = await fetch(`${ECLIPSE_API}/registration/edusp/token`, {
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
          `${ECLIPSE_API}/room/user?list_all=true&with_cards=true`,
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
              `${ECLIPSE_API}/room/detail/${roomCode}?fields[]=id&fields[]=name&with_category_groups=true`,
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
        let url = `${ECLIPSE_API}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=${isExpired}&filter_expired=${!isExpired}&is_exam=false&is_essay=false`;

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
        const { taskData, token, isDraft, minTime, maxTime, userNick, targets, isExpired } = payload;
        const taskId = taskData.id;

        console.log(`[complete] task_id=${taskId}, draft=${isDraft}`);

        // Skip essays and exams
        if (taskData.is_essay) {
          result = { success: true, skipped: true, reason: "essay", _taskId: taskId };
          break;
        }
        if (taskData.is_exam) {
          result = { success: true, skipped: true, reason: "exam", _taskId: taskId };
          break;
        }

        // Build Catalyst payload (matching Eclipse Lunar format)
        const taskPayload = { ...taskData, score: 100, is_prova: false, task_id: taskId };
        delete taskPayload.id;

        const completePayload = {
          tasks: [taskPayload],
          auth_token: token,
          publication_targets: targets || [],
          room_name_for_apply: taskData.room || taskData.publication_target || "",
          time_min: minTime || 1,
          time_max: maxTime || 3,
          is_draft: isDraft || false,
          salvar_rascunho: isDraft || false,
          user_nick: userNick || "",
        };

        console.log(`[complete] Sending to Catalyst: task_id=${taskId}`);

        const completeRes = await fetch(`${CATALYST_API}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completePayload),
        });

        const responseText = await completeRes.text();
        console.log(`[complete] Catalyst response: status=${completeRes.status}, body=${responseText.substring(0, 500)}`);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new Error(`Catalyst response not JSON: ${completeRes.status} - ${responseText}`);
        }

        if (responseData.success) {
          const jobId = responseData.job_ids?.[String(taskId)] || null;
          const estimatedMinutes = parseEstimatedMinutes(responseData.message);

          if (jobId) {
            console.log(`[complete] Got job_id=${jobId}, estimated=${estimatedMinutes}min. Starting poll...`);
            // Wait estimated time + buffer before polling
            const waitMs = (estimatedMinutes * 60 + 30) * 1000;
            await new Promise(r => setTimeout(r, Math.min(waitMs, 300000))); // max 5 min wait

            try {
              const jobResult = await pollJob(jobId, token, String(taskId), isExpired || false, targets || []);
              result = { success: true, ...jobResult, _taskId: taskId };
            } catch (e) {
              // Poll failed but task may have been submitted
              result = { success: true, pollFailed: true, error: e.message, _taskId: taskId };
            }
          } else {
            result = { success: true, ...responseData, _taskId: taskId };
          }
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
