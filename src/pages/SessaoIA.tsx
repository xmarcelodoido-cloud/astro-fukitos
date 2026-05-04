import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Send,
  Lightbulb,
  Loader2,
  Brain,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { IntroFlow } from "@/components/IntroFlow";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  hint_level?: string;
}

interface Session {
  id: string;
  task_title: string;
  task_content: string | null;
  status: string;
  hint_level: number;
  message_count: number;
  required_minutes: number;
  started_at: string;
  quiz_passed: boolean;
  quiz_attempts: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
}

interface QuizResult {
  correct: boolean;
  correct_index: number;
  explanation: string;
}

const SessaoIA = () => {
  useAntiInspect();
  const [introDone, setIntroDone] = useState(false);
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [hintUsed, setHintUsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([-1, -1, -1]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[] | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const { data: s, error } = await supabase
          .from("ai_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();
        if (error || !s) throw error || new Error("Sessão não encontrada");
        setSession(s as Session);
        setHintUsed(s.hint_level || 0);
        setQuizPassed(s.quiz_passed || false);
        setAttemptsLeft(Math.max(0, 3 - (s.quiz_attempts || 0)));

        const { data: msgs } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        const visible = (msgs ?? []).filter(
          (m: any) => !(m.role === "system" && m.content.startsWith("__QUIZ__:"))
        );

        if (visible.length > 0) {
          setMessages(visible as Message[]);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "system",
              content: `👋 **Bem-vindo!** Eu sou a tutora de IA do Astrokitos.\n\n**Atividade:** ${s.task_title}\n\n⏱️ Você precisa estudar por pelo menos **${s.required_minutes} minutos** antes de poder enviar a tarefa, e antes do envio responderá um **quiz com 3 perguntas** sobre o conteúdo (3 tentativas).\n\nVou te mostrar agora as questões da Sala do Futuro exatamente como elas estão...`,
            },
          ]);
          // Dispara mensagem inicial pra IA listar as questões originais
          setTimeout(() => {
            callTutor(
              "Iniciar sessão: por favor, mostre todas as questões desta atividade exatamente como elas estão na Sala do Futuro (enunciado + alternativas), numeradas, e depois pergunte por qual quero começar.",
            );
          }, 400);
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao carregar sessão");
      } finally {
        setInitLoading(false);
      }
    })();
  }, [sessionId]);

  // Cronômetro de tempo mínimo
  useEffect(() => {
    if (!session) return;
    const update = () => {
      const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
      const total = session.required_minutes * 60;
      setSecondsLeft(Math.max(0, Math.ceil(total - elapsed)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const callTutor = async (
    message: string,
    requestHintLevel?: "light" | "medium" | "deep"
  ) => {
    if (!sessionId) return;
    setLoading(true);

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { sessionId, message, requestHintLevel },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        hint_level: data.hintLevel,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (requestHintLevel) {
        const map = { light: 1, medium: 2, deep: 3 };
        setHintUsed((h) => Math.max(h, map[requestHintLevel]));
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao falar com a IA");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    callTutor(msg);
  };

  const handleHint = (level: 1 | 2 | 3) => {
    if (loading) return;
    if (level <= hintUsed) {
      toast.info("Você já usou esse nível de dica");
      return;
    }
    const map = { 1: "light", 2: "medium", 3: "deep" } as const;
    const labels = {
      1: "leve (conceitual)",
      2: "média (exemplo análogo)",
      3: "profunda (passo a passo)",
    };
    callTutor(`Preciso de uma dica ${labels[level]}.`, map[level]);
  };

  const openQuiz = async () => {
    if (!sessionId) return;
    setQuizOpen(true);
    if (quizQuestions.length > 0) return; // já gerado
    setQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-quiz", {
        body: { sessionId, action: "generate" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuizQuestions(data.questions);
      setQuizAnswers([-1, -1, -1]);
      setQuizResults(null);
    } catch (err: any) {
      toast.error("Erro ao gerar quiz: " + err.message);
      setQuizOpen(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!sessionId) return;
    if (quizAnswers.some((a) => a < 0)) {
      toast.error("Responda todas as perguntas");
      return;
    }
    setQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-quiz", {
        body: { sessionId, action: "validate", answers: quizAnswers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuizResults(data.results);
      setAttemptsLeft(data.attempts_left);
      if (data.passed) {
        setQuizPassed(true);
        toast.success("🎉 Você acertou! Envio liberado.");
      } else if (data.attempts_left > 0) {
        toast.error(
          `Algumas respostas estão erradas. Você ainda tem ${data.attempts_left} tentativa(s).`
        );
      } else {
        toast.error("Tentativas esgotadas. A tarefa precisa ser feita por completo.");
      }
    } catch (err: any) {
      toast.error("Erro ao validar quiz: " + err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  const retryQuiz = () => {
    setQuizAnswers([-1, -1, -1]);
    setQuizResults(null);
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    if (secondsLeft > 0) {
      toast.error(
        `Aguarde mais ${formatTime(secondsLeft)} antes de enviar a tarefa.`
      );
      return;
    }
    if (!quizPassed) {
      toast.error("Você precisa passar no quiz antes de enviar.");
      openQuiz();
      return;
    }
    setFinishing(true);
    try {
      const score = Math.max(40, 100 - hintUsed * 15);
      await supabase
        .from("ai_sessions")
        .update({
          status: "completed",
          score,
          completed_at: new Date().toISOString(),
          min_time_passed: true,
        })
        .eq("id", sessionId);
      toast.success(`Sessão concluída! Pontuação: ${score}`);
      setTimeout(() => navigate("/ia"), 1200);
    } catch (err: any) {
      toast.error("Erro ao finalizar");
    } finally {
      setFinishing(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Sessão não encontrada</p>
        <Button onClick={() => navigate("/ia")} variant="outline">
          Voltar
        </Button>
      </div>
    );
  }

  const canSubmit = secondsLeft === 0 && quizPassed;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {!introDone && (
        <IntroFlow storageKey="astrokitos_intro_sessao" onDone={() => setIntroDone(true)} />
      )}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ia")}
            className="text-muted-foreground hover:text-foreground"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-base md:text-lg font-bold font-bricolage truncate text-gradient">
              {session.task_title}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Brain size={12} /> {session.message_count || 0} msgs
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {secondsLeft > 0 ? (
                  <span className="text-yellow-500">{formatTime(secondsLeft)}</span>
                ) : (
                  <span className="text-green-500">Tempo OK</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                {quizPassed ? (
                  <>
                    <Unlock size={12} className="text-green-500" />
                    <span className="text-green-500">Quiz OK</span>
                  </>
                ) : (
                  <>
                    <Lock size={12} className="text-yellow-500" />
                    <span className="text-yellow-500">Bloqueado</span>
                  </>
                )}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
            title="Início"
          >
            <Home size={18} />
          </Button>
        </div>
      </div>

      {/* Aviso de IA */}
      <div className="relative z-10 container mx-auto max-w-4xl px-4 pt-3">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">Aviso:</span> IAs podem falhar. Revise as respostas antes de enviar a tarefa na SED.
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-gradient-brand text-white rounded-br-sm"
                      : msg.role === "system"
                      ? "bg-accent/10 border border-accent/30 text-foreground rounded-bl-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm card-shadow"
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:my-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.hint_level && msg.hint_level !== "none" && (
                    <div className="text-[10px] mt-2 opacity-70 flex items-center gap-1">
                      <Lightbulb size={10} />
                      Dica{" "}
                      {msg.hint_level === "light"
                        ? "Leve"
                        : msg.hint_level === "medium"
                        ? "Média"
                        : "Profunda"}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-card border border-border rounded-2xl px-4 py-3 flex gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </motion.div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Action bar */}
      <div className="relative z-10 border-t border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-4xl space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            {[1, 2, 3].map((lvl) => (
              <Button
                key={lvl}
                variant="outline"
                size="sm"
                onClick={() => handleHint(lvl as 1 | 2 | 3)}
                disabled={loading || lvl <= hintUsed}
                className="text-xs border-accent/40 text-accent hover:bg-accent/10"
              >
                <Lightbulb size={12} className="mr-1" />
                {lvl === 1 ? "Dica Leve" : lvl === 2 ? "Dica Média" : "Dica Profunda"}
                {lvl <= hintUsed && " ✓"}
              </Button>
            ))}

            <div className="flex-1" />

            <Button
              size="sm"
              variant={quizPassed ? "outline" : "default"}
              onClick={openQuiz}
              disabled={attemptsLeft <= 0 && !quizPassed}
              className={
                quizPassed
                  ? "border-green-500/50 text-green-500"
                  : "bg-accent text-white"
              }
            >
              {quizPassed ? (
                <>
                  <CheckCircle2 size={14} className="mr-1" /> Quiz aprovado
                </>
              ) : (
                <>
                  <Brain size={14} className="mr-1" /> Fazer Quiz ({attemptsLeft} tent.)
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleFinish}
              disabled={finishing || !canSubmit}
              className="bg-gradient-brand text-white"
              title={
                !canSubmit
                  ? secondsLeft > 0
                    ? `Aguarde ${formatTime(secondsLeft)}`
                    : "Passe no quiz primeiro"
                  : "Enviar tarefa"
              }
            >
              {finishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canSubmit ? (
                <>
                  <Unlock size={14} className="mr-1" /> Enviar tarefa
                </>
              ) : (
                <>
                  <Lock size={14} className="mr-1" /> Bloqueado
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite sua resposta ou dúvida..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-gradient-brand text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      <Dialog open={quizOpen} onOpenChange={(o) => !quizLoading && setQuizOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bricolage flex items-center gap-2">
              <Brain className="text-primary" />
              Quiz de verificação
            </DialogTitle>
            <DialogDescription>
              Responda as 3 perguntas corretamente para liberar o envio. Você tem{" "}
              <span className="font-semibold text-yellow-500">{attemptsLeft}</span>{" "}
              tentativa(s).
            </DialogDescription>
          </DialogHeader>

          {quizLoading && quizQuestions.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando perguntas com a IA...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((q, qi) => {
                const result = quizResults?.[qi];
                return (
                  <div
                    key={qi}
                    className={`p-4 rounded-lg border ${
                      result
                        ? result.correct
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-destructive/40 bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <p className="font-semibold mb-3 text-sm">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const selected = quizAnswers[qi] === oi;
                        const isCorrect = result && oi === result.correct_index;
                        const isWrongPick = result && selected && !result.correct;
                        return (
                          <button
                            key={oi}
                            onClick={() => {
                              if (quizResults || quizLoading || quizPassed) return;
                              setQuizAnswers((prev) => {
                                const next = [...prev];
                                next[qi] = oi;
                                return next;
                              });
                            }}
                            disabled={!!quizResults || quizLoading || quizPassed}
                            className={`w-full text-left p-2.5 rounded-md text-sm border transition ${
                              isCorrect
                                ? "border-green-500 bg-green-500/10 text-green-500"
                                : isWrongPick
                                ? "border-destructive bg-destructive/10 text-destructive"
                                : selected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <span className="font-mono mr-2">
                              {String.fromCharCode(65 + oi)}.
                            </span>
                            {opt}
                            {isCorrect && (
                              <CheckCircle2 size={14} className="inline ml-2" />
                            )}
                            {isWrongPick && (
                              <XCircle size={14} className="inline ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {result && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        {result.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!quizResults && (
              <Button
                onClick={submitQuiz}
                disabled={
                  quizLoading ||
                  quizQuestions.length === 0 ||
                  quizAnswers.some((a) => a < 0)
                }
                className="bg-gradient-brand text-white"
              >
                {quizLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Enviar respostas
              </Button>
            )}
            {quizResults && !quizPassed && attemptsLeft > 0 && (
              <Button onClick={retryQuiz} variant="outline">
                Tentar novamente ({attemptsLeft})
              </Button>
            )}
            {(quizPassed || (quizResults && attemptsLeft <= 0)) && (
              <Button onClick={() => setQuizOpen(false)} variant="outline">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default SessaoIA;
