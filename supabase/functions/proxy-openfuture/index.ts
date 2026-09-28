import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BASE = "https://openfuture.lol";

// Paths the client is allowed to reach through this proxy.
const ALLOWED = [
  /^\/api\/login$/,
  /^\/api\/logout$/,
  /^\/api\/session$/,
  /^\/api\/dashboard$/,
  /^\/api\/perfil$/,
  /^\/api\/boletim$/,
  /^\/api\/mensagens$/,
  /^\/api\/mensagens\/ler$/,
  /^\/api\/donate\/pix$/,
  /^\/api\/donate\/status(\?.*)?$/,
  /^\/api\/speak\/(ext|ios)\/[a-z]+$/,
  /^\/api\/platform\/[a-z0-9_-]+\/[a-z0-9_-]+$/,
];

function isAllowed(path: string) {
  return ALLOWED.some((re) => re.test(path));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== "object") {
      return json({ ok: false, error: "Corpo inválido" }, 400);
    }

    const path: string = String(input.path ?? "");
    const method: string = String(input.method ?? "GET").toUpperCase();
    const sid: string | undefined = input.sid ? String(input.sid) : undefined;
    const body = input.body;

    if (!path.startsWith("/api/") || !isAllowed(path)) {
      return json({ ok: false, error: "Rota não permitida" }, 400);
    }
    if (!["GET", "POST"].includes(method)) {
      return json({ ok: false, error: "Método não permitido" }, 400);
    }

    const headers: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "Origin": BASE,
      "Referer": `${BASE}/`,
    };
    if (sid) headers["Cookie"] = `of_sid=${sid}`;
    if (method === "POST") headers["Content-Type"] = "application/json";

    const upstream = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      redirect: "manual",
    });

    const raw = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.slice(0, 2000) };
    }

    // Capture the session cookie issued on login so the client can reuse it.
    let newSid: string | undefined;
    const setCookie = upstream.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/of_sid=([^;,\s]+)/);
    if (match) newSid = match[1];

    return json({
      ok: upstream.ok,
      status: upstream.status,
      sid: newSid,
      data,
    }, 200);
  } catch (err) {
    console.error("proxy-openfuture error", err);
    return json({ ok: false, error: (err as Error).message ?? "Erro interno" }, 500);
  }
});
