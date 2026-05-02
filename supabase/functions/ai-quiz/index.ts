// Edge function: ai-quiz
// Gera (e valida) um quiz de múltipla escolha sobre a atividade
// para liberar o envio da tarefa no Modo IA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sessionId, action, answers } = body as {
      sessionId: string;
      action: "generate" | "validate";
      answers?: number[]; // índices escolhidos pelo aluno
    };

    if (!sessionId || !action) {
      return new Response(
        JSON.stringify({ error: "sessionId e action são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: session, error: sErr } = await supabase
      .from("ai_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sErr || !session) {
      return new Response(
        JSON.stringify({ error: "Sessão não encontrada" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "generate") {
      // Carrega histórico para contextualizar
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(40);

      const historyText = (msgs ?? [])
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n")
        .slice(0, 6000);

      const systemPrompt = `Você é um avaliador pedagógico do Astrokitos.
Gere EXATAMENTE 3 perguntas de múltipla escolha (4 alternativas cada) sobre a atividade abaixo,
no nível do ensino médio, em português do Brasil. As perguntas devem verificar
se o aluno realmente entendeu o conteúdo (não apenas decorou).
Use o histórico de tutoria para personalizar.

ATIVIDADE: ${session.task_title}
CONTEÚDO: ${(session.task_content ?? "").slice(0, 3000)}

HISTÓRICO DA TUTORIA:
${historyText}`;

      const aiRes = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Gere o quiz agora." },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "return_quiz",
                  description: "Retorna 3 perguntas de múltipla escolha",
                  parameters: {
                    type: "object",
                    properties: {
                      questions: {
                        type: "array",
                        minItems: 3,
                        maxItems: 3,
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            options: {
                              type: "array",
                              minItems: 4,
                              maxItems: 4,
                              items: { type: "string" },
                            },
                            correct_index: {
                              type: "integer",
                              minimum: 0,
                              maximum: 3,
                            },
                            explanation: { type: "string" },
                          },
                          required: [
                            "question",
                            "options",
                            "correct_index",
                            "explanation",
                          ],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["questions"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "return_quiz" },
            },
          }),
        },
      );

      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          return new Response(
            JSON.stringify({ error: "Muitas requisições. Aguarde." }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        if (aiRes.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos da IA esgotados." }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const t = await aiRes.text();
        console.error("ai gateway error", aiRes.status, t);
        return new Response(
          JSON.stringify({ error: "Erro ao gerar quiz" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const data = await aiRes.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

      if (!args?.questions || args.questions.length !== 3) {
        return new Response(
          JSON.stringify({ error: "Falha ao gerar perguntas" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Guardamos o quiz no task_content meta? Melhor: campo separado.
      // Vamos persistir em ai_messages com role 'system' e prefixo especial.
      await supabase.from("ai_messages").insert({
        session_id: sessionId,
        role: "system",
        content: "__QUIZ__:" + JSON.stringify(args.questions),
      });

      // Resposta para o cliente: SEM correct_index nem explanation
      const publicQuestions = args.questions.map((q: any) => ({
        question: q.question,
        options: q.options,
      }));

      return new Response(
        JSON.stringify({ questions: publicQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "validate") {
      if (!Array.isArray(answers) || answers.length !== 3) {
        return new Response(
          JSON.stringify({ error: "answers precisa ter 3 itens" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Recupera o último quiz salvo
      const { data: quizMsgs } = await supabase
        .from("ai_messages")
        .select("content, created_at")
        .eq("session_id", sessionId)
        .eq("role", "system")
        .order("created_at", { ascending: false })
        .limit(10);

      const quizMsg = (quizMsgs ?? []).find((m: any) =>
        m.content.startsWith("__QUIZ__:")
      );
      if (!quizMsg) {
        return new Response(
          JSON.stringify({ error: "Quiz não encontrado, gere primeiro" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const questions = JSON.parse(quizMsg.content.replace("__QUIZ__:", ""));
      const results = questions.map((q: any, i: number) => ({
        correct: q.correct_index === answers[i],
        correct_index: q.correct_index,
        explanation: q.explanation,
      }));
      const allCorrect = results.every((r: any) => r.correct);
      const newAttempts = (session.quiz_attempts ?? 0) + 1;

      const update: any = { quiz_attempts: newAttempts };
      if (allCorrect) update.quiz_passed = true;

      await supabase.from("ai_sessions").update(update).eq("id", sessionId);

      const attemptsLeft = Math.max(0, 3 - newAttempts);

      return new Response(
        JSON.stringify({
          passed: allCorrect,
          results,
          attempts_used: newAttempts,
          attempts_left: attemptsLeft,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "ação inválida" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[ai-quiz] error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
