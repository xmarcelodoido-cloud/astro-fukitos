import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ra } = await req.json();

    if (!ra || typeof ra !== "string") {
      return new Response(
        JSON.stringify({ error: "RA is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("student_warnings")
      .select("id, reason, warned_at, acknowledged")
      .eq("ra", ra)
      .eq("acknowledged", false)
      .order("warned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking warning:", error);
      return new Response(
        JSON.stringify({ hasWarning: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data) {
      return new Response(
        JSON.stringify({
          hasWarning: true,
          id: data.id,
          reason: data.reason,
          warnedAt: data.warned_at,
          acknowledged: data.acknowledged,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ hasWarning: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ hasWarning: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
