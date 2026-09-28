/**
 * Cliente das APIs da Sala do Futuro (backend OpenFuture) via Edge Function.
 * Todas as chamadas passam pela função `proxy-openfuture` para evitar CORS
 * e manter o cookie de sessão fora do código do site.
 */

const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-openfuture`;

const SID_KEY = "astrokitos_of_sid";

export function getSid(): string | null {
  try {
    return sessionStorage.getItem(SID_KEY);
  } catch {
    return null;
  }
}

export function setSid(sid: string | null) {
  try {
    if (sid) sessionStorage.setItem(SID_KEY, sid);
    else sessionStorage.removeItem(SID_KEY);
  } catch {
    /* ignore */
  }
}

interface ProxyResult<T> {
  ok: boolean;
  status: number;
  sid?: string;
  data: T;
  error?: string;
}

async function call<T = any>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, method, body, sid: getSid() }),
  });

  const out = (await res.json()) as ProxyResult<T>;
  if (out.sid) setSid(out.sid);

  if (!out.ok) {
    const msg =
      (out.data as any)?.error || out.error || `Falha na requisição (${out.status})`;
    throw new Error(msg);
  }
  return out.data;
}

// ==================== LOGIN ====================

export interface OfLoginResult {
  ok?: boolean;
  nome?: string;
  user?: { nome?: string; ra?: string };
  [k: string]: unknown;
}

export async function ofLogin(ra: string, digito: string, uf: string, senha: string) {
  const data = await call<OfLoginResult>("/api/login", "POST", {
    ra,
    digito,
    uf: uf.toUpperCase(),
    senha,
  });
  return data;
}

export async function ofLogout() {
  try {
    await call("/api/logout", "POST", {});
  } catch {
    /* ignore */
  }
  setSid(null);
}

// ==================== DASHBOARD ====================

export interface DashboardStats {
  tarefas?: number;
  redacoes?: number;
  pendencias?: number;
  mensagens?: number;
  surveys?: number;
  progresso?: { pending: number; finished: number; total: number; pct: number };
}

export interface DashboardData {
  stats?: DashboardStats;
  salas?: any[];
  plataformas?: any[];
  surveys?: any[];
  materiais?: any[];
  faltas?: { total: number; aulas: number; pct: number };
  agenda?: any[];
  motd?: string | null;
}

export const getDashboard = () => call<DashboardData>("/api/dashboard");
export const getMensagens = () => call<any>("/api/mensagens");
export const lerMensagens = (ids?: string[]) =>
  call<any>("/api/mensagens/ler", "POST", ids ? { ids } : {});

// ==================== TAREFAS SP ====================

export interface OfTask {
  id: number;
  pub: string;
  turma?: string;
  component?: string;
  title: string;
  due?: string;
  is_exam?: boolean;
  is_essay?: boolean;
  raw?: any;
}

export const listTarefas = (status: "afazer" | "expirado" = "afazer") =>
  call<{ items: OfTask[] }>("/api/platform/tarefas/list", "POST", { status });

export interface RunJob {
  ok: boolean;
  job_id: string;
  delay_ms: number;
  queue_position: number;
}

export const runTarefa = (task: OfTask, minMs: number, maxMs: number) =>
  call<{ data: RunJob }>("/api/platform/tarefas/run", "POST", {
    task_id: task.id,
    publication_target: task.pub,
    min_time_ms: minMs,
    max_time_ms: maxMs,
  });

export interface JobStatus {
  ok: boolean;
  job_id: string;
  task_id: number;
  status: "queued" | "running" | "submitting" | "done" | "error" | string;
  progress: number;
  total_questions: number;
  answered_questions: number;
  elapsed_ms: number;
  remaining_ms: number;
  log: string[];
  error?: string;
}

export const jobStatus = (jobId: string) =>
  call<{ data: JobStatus }>("/api/platform/tarefas/jobstatus", "POST", { jobId });

// ==================== REDAÇÃO ====================

export const listRedacoes = (status: "afazer" | "expirado" = "afazer") =>
  call<{ items: OfTask[] }>("/api/platform/redacao/list", "POST", { status });

export const runRedacao = (task: OfTask, minMs: number, maxMs: number) =>
  call<{ data: RunJob }>("/api/platform/redacao/run", "POST", {
    task_id: task.id,
    publication_target: task.pub,
    min_time_ms: minMs,
    max_time_ms: maxMs,
  });

// ==================== LEIA SP ====================

export interface LeiaBook {
  id: string;
  title: string;
  sub?: string;
  img?: string;
  quiz?: boolean;
}

export const listLeia = () => call<{ items: LeiaBook[] }>("/api/platform/leia/list");

export const runLeia = (book: LeiaBook) =>
  call<any>("/api/platform/leia/run", "POST", { id: book.id });

// ==================== MATIFIC ====================

export interface MatificAccount {
  coins: number;
  xp: number;
  rank: number;
  starMaster?: { first: number; second: number; third: number };
}

export interface MatificEpisode {
  AssignmentId: string;
  EpisodeId: string;
  Slug: string;
  Order?: number;
  DueDate?: string;
}

export interface MatificCampaign {
  Id: string;
  Episodes: MatificEpisode[];
}

export const matificAccount = () =>
  call<{ data: MatificAccount }>("/api/platform/matific/account");

export const matificList = (fresh = false) =>
  fresh
    ? call<{ raw: { Campaigns: MatificCampaign[] } }>(
        "/api/platform/matific/list",
        "POST",
        { __fresh: 1 },
      )
    : call<{ raw: { Campaigns: MatificCampaign[] } }>("/api/platform/matific/list");

export const matificIsland = () => call<any>("/api/platform/matific/island");

export const matificComplete = (
  episodes: { slug: string; assignmentId: string; campaignId: string }[],
) => call<any>("/api/platform/matific/complete", "POST", { episodes });

// ==================== SPEAK (Efekta) ====================

export const speakStart = (payload: Record<string, unknown> = {}) =>
  call<any>("/api/speak/ext/start", "POST", payload);

export const speakStatus = (payload: Record<string, unknown> = {}) =>
  call<any>("/api/speak/ext/status", "POST", payload);

export const speakSolve = (payload: Record<string, unknown> = {}) =>
  call<any>("/api/speak/ext/solve", "POST", payload);

export const speakList = () => call<any>("/api/speak/ext/list");

// ==================== DOAÇÃO PIX ====================

export interface PixCharge {
  ok: boolean;
  paymentId: string;
  pixCode: string;
  qrCode: string;
}

export const createPix = (amount: number) =>
  call<PixCharge>("/api/donate/pix", "POST", { amount });

export const pixStatus = (id: string) =>
  call<{ ok: boolean; paid: boolean; status: string }>(
    `/api/donate/status?id=${encodeURIComponent(id)}`,
  );
