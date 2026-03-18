import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATALYST_API = "https://catalyst.crimsonzerohub.xyz";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === "status") {
      // Poll job status
      const { jobId } = payload;
      if (!jobId) throw new Error("jobId is required");

      const res = await fetch(`${CATALYST_API}/job/${jobId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Job status check failed: ${res.status} - ${err}`);
      }

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: submit task to Catalyst /complete
    const res = await fetch(`${CATALYST_API}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Catalyst submit failed: ${res.status} - ${err}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
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
