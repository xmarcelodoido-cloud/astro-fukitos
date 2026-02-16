import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDUSP_API = "https://edusp-api.ip.tv";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

function getHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
    "x-api-key": token,
    "User-Agent": USER_AGENT,
  };
}

async function generateAIAnswer(question: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "Resposta não disponível.";

  const title = question.title || question.description || "";
  const comment = question.comment || "";
  const prompt = `Responda esta questão escolar de forma concisa e direta, como um aluno do ensino médio brasileiro responderia. A resposta deve ter no máximo 3 frases.

Questão: ${title}
${comment ? `Contexto: ${comment}` : ""}

Responda apenas com o texto da resposta, sem explicações adicionais.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um estudante do ensino médio brasileiro. Responda questões de forma natural e concisa." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return "Resposta gerada automaticamente.";
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Resposta gerada automaticamente.";
  } catch {
    return "Resposta gerada automaticamente.";
  }
}

async function buildSubmission(answerData: any, isDraft: boolean, durationSeconds: number): Promise<any> {
  const result: any = {
    status: isDraft ? "draft" : "submitted",
    accessed_on: answerData.accessed_on || "room",
    executed_on: answerData.executed_on,
    duration: durationSeconds,
    answers: {},
  };

  const questions = answerData.task?.questions || [];

  for (const qId in answerData.answers) {
    const entry = answerData.answers[qId];
    const q = questions.find((x: any) => x.id === parseInt(qId));

    if (!q) { result.answers[qId] = entry; continue; }

    const base = { question_id: entry.question_id, question_type: q.type };

    switch (q.type) {
      case "order-sentences":
        result.answers[qId] = { ...base, answer: q.options.sentences.map((s: any) => s.value) };
        break;
      case "fill-words":
        result.answers[qId] = { ...base, answer: q.options.phrase.map((i: any) => i.value) };
        break;
      case "fill-letters":
        result.answers[qId] = { ...base, answer: q.options.answer };
        break;
      case "cloud":
        result.answers[qId] = { ...base, answer: q.options.ids };
        break;
      case "text_ai": {
        let text = q.comment ? q.comment.replace(/<\/?p>/g, "") : "";
        if (!text) text = await generateAIAnswer(q);
        result.answers[qId] = { ...base, answer: { "0": text } };
        break;
      }
      default: {
        const answer: Record<string, boolean> = {};
        if (q.options) {
          for (const optId in q.options) {
            if (q.options.hasOwnProperty(optId)) {
              answer[optId] = q.options[optId].answer === true;
            }
          }
        }
        result.answers[qId] = { ...base, answer };
        break;
      }
    }
  }
  return result;
}

async function processTask(body: any): Promise<{ success: boolean; message: string }> {
  const { id, token, room, isDraft, minTime, maxTime } = body;
  const headers = getHeaders(token);

  // Step 0: Initialize/apply the task first (required before answering)
  const applyRes = await fetch(`${EDUSP_API}/tms/task/${id}/apply?preview_mode=false`, {
    method: "GET",
    headers,
  });

  if (!applyRes.ok) {
    const err = await applyRes.text();
    throw new Error(`Apply/init failed: ${applyRes.status} - ${err}`);
  }
  // Consume the response
  await applyRes.json();

  // Step 1: Create draft
  const draftRes = await fetch(`${EDUSP_API}/tms/task/${id}/answer`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "draft", accessed_on: "room", executed_on: room, answers: {} }),
  });

  if (!draftRes.ok) {
    const err = await draftRes.text();
    throw new Error(`Draft failed: ${draftRes.status} - ${err}`);
  }

  const { id: answerId } = await draftRes.json();

  // Step 2: Brief wait (edge functions have ~25s limit, so we can't wait the full time)
  await new Promise((r) => setTimeout(r, 3000));

  // Step 3: Get questions with answers
  const getRes = await fetch(
    `${EDUSP_API}/tms/task/${id}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`,
    { method: "GET", headers }
  );

  if (!getRes.ok) {
    const err = await getRes.text();
    throw new Error(`Get answers failed: ${getRes.status} - ${err}`);
  }

  const answerData = await getRes.json();

  // Calculate fake duration in seconds (between minTime and maxTime minutes)
  const minSec = (minTime || 1) * 60;
  const maxSec = (maxTime || 5) * 60;
  const fakeDuration = Math.floor(Math.random() * (maxSec - minSec) + minSec);

  // Step 4: Build and submit
  const submitBody = await buildSubmission(answerData, isDraft, fakeDuration);

  const submitRes = await fetch(`${EDUSP_API}/tms/task/${id}/answer/${answerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(submitBody),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Submit failed: ${submitRes.status} - ${err}`);
  }

  return { success: true, message: "Task completed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const result = await processTask(body);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
