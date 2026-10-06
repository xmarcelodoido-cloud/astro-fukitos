const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-leiasp`;
const KEY = "astrokitos_leia_token";

export interface LeiaToken { access_token: string; expires_at?: string }

const b64 = (s: string) => {
  let t = s.replace(/\s/g, "+").replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return atob(t);
};

export function parseLeiaLink(input: string): LeiaToken | null {
  const s = input.trim();
  let t = s;
  const m = s.match(/[?&]t=([^&#\s]+)/);
  if (m) { try { t = decodeURIComponent(m[1]); } catch { t = m[1]; } }
  try {
    const obj = JSON.parse(b64(t));
    if (obj?.access_token) return { access_token: String(obj.access_token), expires_at: obj.expires_at };
  } catch { /* not b64 */ }
  if (/^[A-Za-z0-9]{20,200}$/.test(t)) return { access_token: t };
  return null;
}

export function getLeiaToken(): LeiaToken | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || "null") as LeiaToken | null;
    if (v?.expires_at && new Date(v.expires_at).getTime() < Date.now()) { sessionStorage.removeItem(KEY); return null; }
    return v;
  } catch { return null; }
}
export function setLeiaToken(t: LeiaToken | null) {
  if (t) sessionStorage.setItem(KEY, JSON.stringify(t)); else sessionStorage.removeItem(KEY);
}

export async function leiaGet<T = any>(path: string): Promise<T> {
  const tk = getLeiaToken();
  if (!tk) throw new Error("Conecte sua conta do Leia SP");
  const r = await fetch(URL_, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, token: tk.access_token }),
  });
  const j = await r.json().catch(() => null);
  if (j?.status === 401) { setLeiaToken(null); throw new Error("Acesso expirado, gere um novo link do Leia SP"); }
  if (!j?.ok) throw new Error(j?.error || `Falha no Leia SP (${j?.status ?? r.status})`);
  return j.data as T;
}

export interface LeiaItem { id: string; title: string; img?: string; sub?: string; progress?: number }

const pickArr = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.Books) ? d.Books : Array.isArray(d?.data) ? d.data
  : Array.isArray(d?.items) ? d.items : Array.isArray(d?.books) ? d.books : Array.isArray(d?.results) ? d.results
  : d && typeof d === "object" ? Object.values(d).flatMap((v) => (Array.isArray(v) ? v : [])) : [];

export function normalizeBooks(d: any): LeiaItem[] {
  return pickArr(d).map((x: any) => {
    const b = x?.book ?? x?.Book ?? x;
    const p = x?.ReadingPercent ?? b?.ReadingPercent ?? x?.progress ?? x?.percentage ?? b?.progress;
    const a = b?.Authors ?? b?.authors;
    const author = Array.isArray(a) ? (typeof a[0] === "string" ? a.join(", ") : a[0]?.name ?? a[0]?.Name) : b?.author ?? b?.Author;
    return {
      id: String(b?.Id ?? b?.id ?? b?.bookId ?? x?.id ?? Math.random()),
      title: String(b?.Title ?? b?.title ?? b?.name ?? "Livro"),
      img: b?.CoverPageUrl ?? b?.cover ?? b?.coverUrl ?? b?.image ?? b?.thumbnail ?? b?.cover_url,
      sub: author ?? b?.Publisher ?? b?.publisher,
      progress: typeof p === "number" ? Math.round(p <= 1 && p > 0 ? p * 100 : p) : undefined,
    };
  }).filter((b) => b.title);
}
