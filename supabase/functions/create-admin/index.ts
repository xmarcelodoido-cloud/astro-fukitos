import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: "liberar@fukitos.com",
      password: "fukitos",
      email_confirm: true,
    });

    if (userError) {
      // If user already exists, try to get the user
      if (userError.message.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === "liberar@fukitos.com");
        
        if (existingUser) {
          // Check if already has admin role
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("*")
            .eq("user_id", existingUser.id)
            .eq("role", "admin")
            .maybeSingle();

          if (existingRole) {
            return new Response(
              JSON.stringify({ message: "Admin já existe", userId: existingUser.id }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Add admin role
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: existingUser.id, role: "admin" });

          if (roleError) throw roleError;

          return new Response(
            JSON.stringify({ message: "Role admin adicionada", userId: existingUser.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw userError;
    }

    // Add admin role to the new user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: "admin" });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ message: "Admin criado com sucesso", userId: userData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
