// Server-side access to AI study sessions (tables are admin-only via RLS).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const b = await req.json();
    if (b.action === "create") {
      const ra = str(b.ra, 40).trim();
      if (!ra || !b.task_id || !b.task_title) return out({ error: "Dados inválidos" }, 400);
      const mins = Math.min(60, Math.max(1, Number(b.required_minutes) || 7));
      const { data, error } = await db.from("ai_sessions").insert({
        ra, student_name: str(b.student_name, 120), task_id: str(b.task_id, 60), task_title: str(b.task_title, 300),
        task_content: b.task_content ? str(b.task_content, 60000) : null, required_minutes: mins, started_at: new Date().toISOString(),
      }).select("*").single();
      if (error) return out({ error: "Não foi possível criar a sessão" }, 500);
      return out({ session: data });
    }
    if (!UUID.test(String(b.sessionId ?? ""))) return out({ error: "Sessão inválida" }, 400);
    if (b.action === "get") {
      const { data: s } = await db.from("ai_sessions").select("*").eq("id", b.sessionId).maybeSingle();
      if (!s) return out({ error: "Sessão não encontrada" }, 404);
      const { data: msgs } = await db.from("ai_messages").select("*").eq("session_id", b.sessionId).order("created_at", { ascending: true });
      return out({ session: s, messages: msgs ?? [] });
    }
    if (b.action === "complete") {
      const score = Math.min(100, Math.max(0, Math.round(Number(b.score) || 0)));
      await db.from("ai_sessions").update({ status: "completed", score, completed_at: new Date().toISOString(), min_time_passed: true }).eq("id", b.sessionId);
      return out({ ok: true });
    }
    return out({ error: "Ação inválida" }, 400);
  } catch {
    return out({ error: "Erro interno" }, 500);
  }
});
