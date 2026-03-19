import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDUSP_API = "https://edusp.crimsonzerohub.xyz";
const CATALYST_API = "https://catalyst.crimsonzerohub.xyz";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

function eduspHeaders(token?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
    "User-Agent": USER_AGENT,
    "origin": "https://saladofuturo.educacao.sp.gov.br",
    "referer": "https://saladofuturo.educacao.sp.gov.br/",
  };
  if (token) h["x-api-key"] = token;
  return h;
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
        const res = await fetch(`${EDUSP_API}/registration/edusp`, {
          method: "POST",
          headers: eduspHeaders(),
          body: JSON.stringify({
            realm: "edusp",
            platform: "webclient",
            id: payload.ra,
            password: payload.password,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Login failed: ${res.status} - ${err}`);
        }
        result = await res.json();
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
        const { token, url } = payload;
        const res = await fetch(`${EDUSP_API}${url}`, {
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
        // Build payload exactly matching Eclipse Lunar's tfSendTasks:
        // tasks: [{ ...task, score:100, is_prova:false, task_id:task.id }]
        // Then delete payload.tasks[0].id
        const rawTask = payload.taskData;
        const taskId = rawTask.id;
        
        // Spread the full raw task, add required fields, remove id
        const taskForCatalyst = { 
          ...rawTask, 
          score: payload.score || 100, 
          is_prova: false, 
          task_id: taskId 
        };
        delete taskForCatalyst.id;

        const catalystPayload = {
          tasks: [taskForCatalyst],
          auth_token: payload.token,
          publication_targets: payload.publicationTargets || [],
          room_name_for_apply: rawTask.publication_target || payload.room || "",
          time_min: payload.minTime || 1,
          time_max: payload.maxTime || 3,
          is_draft: payload.isDraft || false,
          salvar_rascunho: payload.isDraft || false,
          user_nick: payload.userNick || "",
        };

        console.log(`[complete] Sending to Catalyst: task_id=${taskId}, room=${catalystPayload.room_name_for_apply}, targets=${catalystPayload.publication_targets.length}, time=${catalystPayload.time_min}-${catalystPayload.time_max}, draft=${catalystPayload.is_draft}`);

        const res = await fetch(`${CATALYST_API}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(catalystPayload),
        });
        
        const responseText = await res.text();
        console.log(`[complete] Catalyst response: status=${res.status}, body=${responseText.substring(0, 500)}`);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new Error(`Catalyst response not JSON: ${res.status} - ${responseText}`);
        }

        if (!res.ok && !responseData?.success) {
          throw new Error(`Catalyst submit failed: ${res.status} - ${responseText}`);
        }

        // Return the response along with the original task id for job_id mapping
        result = { ...responseData, _taskId: taskId };
        break;
      }

      case "status": {
        const res = await fetch(`${CATALYST_API}/job/${payload.jobId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Job status failed: ${res.status} - ${err}`);
        }
        result = await res.json();
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
