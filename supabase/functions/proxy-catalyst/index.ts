import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// API oficial da Sala do Futuro (o espelho antigo saiu do ar)
const ECLIPSE_API = "https://edusp-api.ip.tv";
const SED_LOGIN_PROXY = "https://taskitos.cupiditys.lol";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

function randomHex(len: number): string {
  const arr = new Uint8Array(len / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function eduspHeaders(token?: string) {
  const reqId = randomHex(32);
  const traceId = randomHex(16);
  const h: Record<string, string> = {
    "Accept": "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    "Request-Id": `|${reqId}.${traceId}`,
    "Traceparent": `00-${reqId}-${traceId}-01`,
    "X-Api-Realm": "edusp",
    "X-Api-Platform": "webclient",
    "User-Agent": USER_AGENT,
    "origin": "https://saladofuturo.educacao.sp.gov.br",
    "referer": "https://saladofuturo.educacao.sp.gov.br/",
  };
  if (token) h["x-api-key"] = token;
  return h;
}

function parseEstimatedMinutes(message: string | undefined): number {
  if (!message) return 2;
  const m = message.match(/~?\s*(\d+)\s*min/i);
  if (m) return Math.max(1, parseInt(m[1]));
  const s = message.match(/~?\s*(\d+)\s*s(?:ec)?/i);
  if (s) return Math.max(1, Math.ceil(parseInt(s[1]) / 60));
  return 2;
}

const stripHtml = (s: string) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Monta a resposta correta de uma questão a partir do gabarito devolvido pela API. */
function buildAnswer(question: any): any {
  const opts = question?.options ?? {};

  switch (question?.type) {
    case "order-sentences": {
      const sentences = opts.sentences ?? [];
      return sentences.map((s: any) => s?.value ?? s);
    }
    case "fill-words": {
      const phrase = opts.phrase ?? [];
      return phrase.filter((_: any, i: number) => i % 2 !== 0).map((p: any) => p?.value ?? p);
    }
    case "fill-letters": {
      return opts.answer ?? {};
    }
    case "cloud": {
      return opts.ids ?? [];
    }
    case "text_ai": {
      return { "0": stripHtml(question?.comment).slice(0, 500) || "Resposta." };
    }
    default: {
      // múltipla escolha / verdadeiro-falso
      const answer: Record<string, boolean> = {};
      for (const key of Object.keys(opts)) {
        const o = opts[key] ?? {};
        answer[key] = o.answer === true || o.right === true || o.correct === true;
      }
      return answer;
    }
  }
}

async function verifyTaskCompletion(token: string, taskId: string, isExpired: boolean, targets: string[]): Promise<boolean> {
  try {
    const tStr = targets.map(t => `publication_target=${encodeURIComponent(t)}`).join("&");
    const url = `${ECLIPSE_API}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=${isExpired}&filter_expired=${!isExpired}&is_exam=false&is_essay=false&${tStr}`;
    
    const res = await fetch(url, { method: "GET", headers: eduspHeaders(token) });
    if (!res.ok) return false;
    
    const items = await res.json();
    const arr = Array.isArray(items) ? items : [];
    const found = arr.find((t: any) => String(t.id) === String(taskId));
    
    // For pending: task disappeared = delivered successfully
    if (!isExpired && !found) return true;
    // For expired: has draft = saved
    if (isExpired && found && (found.answer_status === "draft" || found.answer_id)) return true;
    
    return false;
  } catch {
    return false;
  }
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
        const ra = String(payload.ra ?? "").trim().toLowerCase();
        const password = String(payload.password ?? "");
        if (!ra || !password) {
          result = { success: false, error: "Informe RA e senha" };
          break;
        }

        // Passo 1: login oficial na SED (mesmo fluxo do site da Sala do Futuro)
        const sedRes = await fetch(
          "https://sedintegracoes.educacao.sp.gov.br/saladofuturobffapi/credenciais/api/LoginCompletoToken",
          {
            method: "POST",
            headers: {
              "Accept": "*/*",
              "Content-Type": "application/json",
              "ocp-apim-subscription-key": "d701a2043aa24d7ebb37e9adf60d043b",
              "User-Agent": USER_AGENT,
              "origin": "https://saladofuturo.educacao.sp.gov.br",
              "referer": "https://saladofuturo.educacao.sp.gov.br/",
            },
            body: JSON.stringify({ user: ra, senha: password }),
          },
        );
        const sedText = await sedRes.text();
        let sed: any = {};
        try { sed = JSON.parse(sedText); } catch { /* ignore */ }

        if (!sedRes.ok || !sed?.token) {
          console.log(`[login] SED status=${sedRes.status} body=${sedText.slice(0, 200)}`);
          result = { success: false, error: "RA ou senha inválidos" };
          break;
        }

        // Passo 2: troca o token SED pelo auth_token da plataforma
        const tokRes = await fetch(`${ECLIPSE_API}/registration/edusp/token`, {
          method: "POST",
          headers: eduspHeaders(),
          body: JSON.stringify({ token: sed.token }),
        });
        if (!tokRes.ok) {
          const t = await tokRes.text();
          console.log(`[login] token exchange status=${tokRes.status} body=${t.slice(0, 200)}`);
          result = { success: false, error: "Falha ao conectar à Sala do Futuro. Tente novamente." };
          break;
        }
        result = await tokRes.json();
        if (!result?.nick && sed?.DadosUsuario?.NAME) result.nick = sed.DadosUsuario.NAME;
        break;
      }

      case "rooms": {
        const res = await fetch(
          `${ECLIPSE_API}/room/user?list_all=true&with_cards=true`,
          { method: "GET", headers: eduspHeaders(payload.token) }
        );
        if (!res.ok) {
          const err = await res.text();
          console.log(`[rooms] status=${res.status} body=${err.slice(0, 200)}`);
          result = { success: false, error: res.status === 401 || res.status === 403
            ? "Sessão expirada. Saia e entre novamente."
            : "Não foi possível carregar suas salas" };
          break;
        }
        result = await res.json();
        break;
      }

      case "tasks": {
        const { token, filter, targets, roomCode } = payload;

        // Get room detail for category groups
        let categoryTargets: string[] = [];
        if (roomCode) {
          try {
            const detailRes = await fetch(
              `${ECLIPSE_API}/room/detail/${roomCode}?fields[]=id&fields[]=name&with_category_groups=true`,
              { method: "GET", headers: eduspHeaders(token) }
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.group_categories) {
                categoryTargets = detailData.group_categories.map((c: any) => c.id);
              }
            }
          } catch (e) {
            console.log("[tasks] Failed to get room detail:", e);
          }
        }

        const isExpired = filter === "expired";
        let url = `${ECLIPSE_API}/tms/task/todo?limit=100&offset=0&with_answer=true&with_apply_moment=true&expired_only=${isExpired}&filter_expired=${!isExpired}&is_exam=false&is_essay=false`;

        for (const t of (targets || [])) {
          url += `&publication_target=${encodeURIComponent(t)}`;
        }
        for (const ct of categoryTargets) {
          url += `&publication_target=${encodeURIComponent(ct)}`;
        }

        url += "&answer_statuses=pending&answer_statuses=draft";

        const res = await fetch(url, {
          method: "GET",
          headers: eduspHeaders(token),
        });

        if (!res.ok) {
          const err = await res.text();
          console.log(`[tasks] status=${res.status} body=${err.slice(0, 200)}`);
          result = { success: false, error: res.status === 401 || res.status === 403
            ? "Sessão expirada. Saia e entre novamente."
            : "Não foi possível buscar as tarefas" };
          break;
        }
        result = await res.json();
        break;
      }

      case "complete": {
        const { taskData, token, isDraft, minTime, maxTime, userNick, targets, isExpired } = payload;
        const taskId = taskData.id;

        console.log(`[complete] task_id=${taskId}, draft=${isDraft}`);

        // Skip essays and exams
        if (taskData.is_essay) {
          result = { success: true, skipped: true, reason: "essay", _taskId: taskId };
          break;
        }
        if (taskData.is_exam) {
          result = { success: true, skipped: true, reason: "exam", _taskId: taskId };
          break;
        }

        // 1) Busca as questões com o gabarito
        const applyRes = await fetch(
          `${ECLIPSE_API}/tms/task/${taskId}/apply?preview_mode=false`,
          { method: "GET", headers: eduspHeaders(token) },
        );
        if (!applyRes.ok) {
          const err = await applyRes.text();
          console.log(`[complete] apply status=${applyRes.status} body=${err.slice(0, 300)}`);
          const needsCaptcha = /captcha/i.test(err);
          result = {
            success: false,
            blocked: true,
            reason: needsCaptcha ? "captcha" : "denied",
            error: needsCaptcha
              ? "Esta tarefa exige verificação humana na Sala do Futuro"
              : "A Sala do Futuro bloqueou o acesso a esta tarefa",
            _taskId: taskId,
          };
          break;
        }
        const apply = await applyRes.json();
        const questions: any[] = apply?.questions ?? [];
        if (!questions.length) {
          result = { success: false, error: "A tarefa não retornou questões", _taskId: taskId };
          break;
        }

        // 2) Monta as respostas
        const answers: Record<string, any> = {};
        for (const q of questions) {
          answers[String(q.id)] = {
            question_id: q.id,
            question_type: q.type,
            answer: buildAnswer(q),
          };
        }

        const minM = Number(minTime) || 1;
        const maxM = Number(maxTime) || Math.max(minM, 3);
        const minutes = minM + Math.random() * Math.max(0, maxM - minM);
        const duration = Math.round(minutes * 60 * 1000);
        const room = taskData.room || taskData.publication_target ||
          (Array.isArray(targets) ? targets[0] : "") || "";

        const answerBody = {
          status: isDraft ? "draft" : "submitted",
          accessed_on: "room",
          executed_on: room,
          answers,
          duration,
          ...(userNick ? { executed_by: userNick } : {}),
        };

        // Rascunho existente: atualiza a resposta em vez de criar outra
        const existingAnswerId = taskData.answer_id || taskData.answer?.id;
        const submitRes = await fetch(
          existingAnswerId
            ? `${ECLIPSE_API}/tms/task/${taskId}/answer/${existingAnswerId}`
            : `${ECLIPSE_API}/tms/task/${taskId}/answer`, {
          method: existingAnswerId ? "PUT" : "POST",
          headers: eduspHeaders(token),
          body: JSON.stringify(answerBody),
        });

        const submitText = await submitRes.text();
        console.log(`[complete] answer status=${submitRes.status} body=${submitText.slice(0, 300)}`);

        if (!submitRes.ok) {
          result = {
            success: false,
            error: `Falha ao enviar (${submitRes.status})`,
            detail: submitText.slice(0, 300),
            _taskId: taskId,
          };
          break;
        }

        let submitData: any = {};
        try { submitData = JSON.parse(submitText); } catch { /* resposta vazia */ }

        result = {
          success: true,
          draft: !!isDraft,
          questions: questions.length,
          answer_id: submitData?.id,
          _taskId: taskId,
        };
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
    console.error(`[proxy-catalyst] Error: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message || "Erro interno" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
