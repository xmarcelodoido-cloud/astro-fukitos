// Edge function: ai-tutor
// Streams Socratic-style tutoring via Lovable AI Gateway and persists messages.
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

function buildSystemPrompt(
  taskTitle: string,
  taskContent: string | null,
  hintLevelRequested: string | null,
) {
  const hintRule = hintLevelRequested
    ? `\nO aluno solicitou uma DICA de nível **${hintLevelRequested}**. Forneça apenas esse nível, sem entregar a resposta final.`
    : "";

  return `Você é a tutora de IA do Astrokitos, especializada em ensino socrático para estudantes da Sala do Futuro (SP).

REGRAS ABSOLUTAS:
1. NUNCA dê a resposta final direta. Sempre guie o aluno através de perguntas.
2. Use o método socrático: questione, provoque reflexão, peça que o aluno tente.
3. Quando der dicas, siga 3 níveis progressivos:
   - LEVE: pergunta conceitual, sem mencionar a resposta.
   - MÉDIA: exemplo análogo (problema parecido) resolvido passo a passo, deixando o aluno aplicar no problema dele.
   - PROFUNDA: explicação detalhada do raciocínio, mas terminando com pergunta para o aluno completar.
4. Mantenha o contexto da conversa toda.
5. Seja encorajadora, positiva e use linguagem acessível para ensino médio.
6. Sempre termine sua resposta com uma pergunta para manter o diálogo.
7. Use markdown para formatar (negrito, listas, fórmulas).
8. Responda em português do Brasil.

APRESENTAÇÃO DAS QUESTÕES (MUITO IMPORTANTE):
- Na sua PRIMEIRA mensagem (quando o aluno disser "iniciar" ou for o começo da sessão), liste TODAS as questões da atividade EXATAMENTE como elas aparecem no JSON abaixo (enunciado completo + todas as alternativas, na mesma ordem). Não resuma, não reescreva, não corte.
- Numere cada questão (Questão 1, Questão 2, ...) e use blockquote ou lista para as alternativas (A, B, C, D, E).
- Depois de mostrar todas, convide o aluno a escolher por qual quer começar a estudar.
- Para cada questão estudada, NUNCA diga qual alternativa é a correta — apenas faça o aluno raciocinar até chegar na resposta sozinho.

ATIVIDADE ATUAL (JSON bruto vindo da Sala do Futuro):
**Título:** ${taskTitle}
${taskContent ? `**Conteúdo (questões):**\n\`\`\`json\n${taskContent}\n\`\`\`` : ""}
${hintRule}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      sessionId,
      message,
      requestHintLevel,
    }: {
      sessionId: string;
      message: string;
      requestHintLevel?: "light" | "medium" | "deep" | null;
    } = body;

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "sessionId e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load session
    const { data: session, error: sessionErr } = await supabase
      .from("ai_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ error: "Sessão não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load conversation history
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // Persist user message
    await supabase.from("ai_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
    });

    const systemPrompt = buildSystemPrompt(
      session.task_title,
      session.task_content,
      requestHintLevel ?? null,
    );

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      },
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Muitas requisições. Aguarde alguns instantes e tente novamente.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos da IA esgotados. Adicione créditos no workspace.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const replyContent: string =
      aiData.choices?.[0]?.message?.content ??
      "Desculpe, não consegui gerar uma resposta.";

    const hintLevelStored = requestHintLevel ?? "none";

    // Persist assistant reply
    await supabase.from("ai_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: replyContent,
      hint_level: hintLevelStored,
    });

    // Update session counters
    const newCount = (session.message_count ?? 0) + 1;
    const hintLevelMap: Record<string, number> = {
      none: 0,
      light: 1,
      medium: 2,
      deep: 3,
    };
    const newHintLevel = Math.max(
      session.hint_level ?? 0,
      hintLevelMap[hintLevelStored] ?? 0,
    );
    await supabase
      .from("ai_sessions")
      .update({
        message_count: newCount,
        hint_level: newHintLevel,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        reply: replyContent,
        hintLevel: hintLevelStored,
        messageCount: newCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[ai-tutor] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
