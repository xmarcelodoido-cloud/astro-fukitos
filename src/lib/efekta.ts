const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-efekta`;

const TOKEN_KEY = "astrokitos_efekta_tokens";

export interface EfektaTokens {
  catalyst_token: string;
  efid_access?: string;
  azid_token?: string;
}

export function getEfektaTokens(): EfektaTokens | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setEfektaTokens(t: EfektaTokens | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export interface EfektaLesson {
  lessonId: string;
  activityId: string;
  taskId: string;
  sessionId: string;
  title: string;
  score: number;
  completed: boolean;
}

async function call(action: string, payload: any = {}) {
  const tokens = getEfektaTokens();
  if (!tokens?.catalyst_token) throw new Error("Tokens Efekta não configurados");
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, tokens, ...payload }),
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || "Erro Efekta");
  return data;
}

export async function listLessons(): Promise<EfektaLesson[]> {
  const data = await call("list_lessons");
  return data.lessons || [];
}

export async function completeLesson(lesson: EfektaLesson) {
  return call("complete_lesson", { lesson });
}
