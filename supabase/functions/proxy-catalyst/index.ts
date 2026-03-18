import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDUSP_API = "https://edusp.crimsonzerohub.xyz";
const CATALYST_API = "https://catalyst.crimsonzerohub.xyz";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

function eduspHeaders(token?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
    "User-Agent": USER_AGENT,
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
        // url is the full query string path for tasks
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
        const res = await fetch(`${CATALYST_API}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Catalyst submit failed: ${res.status} - ${err}`);
        }
        result = await res.json();
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
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
