import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BASE = "https://prod-apistudent.elefanteletrado.com.br";
const ALLOWED = [
  /^\/v1\/student\/thermometer$/,
  /^\/v1\/student\/assignments\/received$/,
  /^\/v1\/library\/discover\/\?grade=\d{1,2}$/,
  /^\/v1\/student\/books\/\d+$/,
];

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json().catch(() => null);
    const path = String(input?.path ?? "");
    const token = String(input?.token ?? "");
    if (!/^[A-Za-z0-9]{20,200}$/.test(token)) return json({ ok: false, error: "Acesso inválido" }, 400);
    if (!ALLOWED.some((r) => r.test(path))) return json({ ok: false, error: "Rota não permitida" }, 400);
    const up = await fetch(BASE + path, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", Origin: "https://em.elefanteletrado.com.br" },
    });
    const raw = await up.text();
    let data: unknown; try { data = JSON.parse(raw); } catch { data = null; }
    return json({ ok: up.ok, status: up.status, data });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
