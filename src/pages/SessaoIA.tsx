import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Send,
  Lightbulb,
  X,
  Loader2,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

const SessaoIA = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [hintUsed, setHintUsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
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

        const { data: msgs } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setMessages(msgs as Message[]);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "system",
              content: `👋 **Bem-vindo!** Eu sou a tutora de IA do Astrokitos. Vou te ajudar a resolver esta atividade fazendo perguntas — você vai aprender de verdade, não apenas receber respostas.\n\n**Atividade:** ${s.task_title}\n\nVamos começar? Qual é a sua primeira ideia para resolver isso?`,
            },
          ]);
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao carregar sessão");
      } finally {
        setInitLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const callTutor = async (
    message: string,
    requestHintLevel?: "light" | "medium" | "deep"
  ) => {
    if (!sessionId) return;
    setLoading(true);

    // Optimistic user message
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
    const labels = { 1: "leve (conceitual)", 2: "média (exemplo análogo)", 3: "profunda (passo a passo)" };
    callTutor(`Preciso de uma dica ${labels[level]}.`, map[level]);
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    setFinishing(true);
    try {
      const score = Math.max(40, 100 - hintUsed * 15);
      await supabase
        .from("ai_sessions")
        .update({
          status: "completed",
          score,
          completed_at: new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 border-b border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ia")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-base md:text-lg font-bold font-bricolage truncate text-gradient">
              {session.task_title}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Brain size={12} /> Tutora de IA · {session.message_count || 0} mensagens
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFinish}
            disabled={finishing}
            className="text-accent hover:text-accent"
            title="Finalizar sessão"
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />}
          </Button>
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

      {/* Hint buttons + input */}
      <div className="relative z-10 border-t border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="container mx-auto max-w-4xl space-y-3">
          <div className="flex gap-2 flex-wrap">
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
    </div>
  );
};

export default SessaoIA;
