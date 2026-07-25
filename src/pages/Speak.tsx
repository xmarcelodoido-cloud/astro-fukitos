import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mic, Home, LogOut, ShieldAlert, KeyRound, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { useSession } from "@/contexts/SessionContext";
import {
  EfektaLesson,
  EfektaTokens,
  completeLesson,
  getEfektaTokens,
  listLessons,
  setEfektaTokens,
} from "@/lib/efekta";
import { toast } from "sonner";

const Speak = () => {
  useAntiInspect();
  const navigate = useNavigate();
  const { session, logout } = useSession();

  const [tokens, setTokens] = useState<EfektaTokens | null>(() => getEfektaTokens());
  const [showTokenForm, setShowTokenForm] = useState<boolean>(() => !getEfektaTokens());
  const [catalyst, setCatalyst] = useState("");
  const [efid, setEfid] = useState("");
  const [azid, setAzid] = useState("");

  const [lessons, setLessons] = useState<EfektaLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, "pending" | "ok" | "fail">>({});

  const saveTokens = () => {
    const c = catalyst.trim();
    if (!c) { toast.error("Cole o catalyst_token"); return; }
    const t: EfektaTokens = {
      catalyst_token: c,
      efid_access: efid.trim() || undefined,
      azid_token: azid.trim() || undefined,
    };
    setEfektaTokens(t);
    setTokens(t);
    setShowTokenForm(false);
    toast.success("Tokens salvos nesta sessão");
    loadLessons(t);
  };

  const clearTokens = () => {
    setEfektaTokens(null);
    setTokens(null);
    setLessons([]);
    setStatusMap({});
    setShowTokenForm(true);
  };

  const loadLessons = async (_t?: EfektaTokens) => {
    setLoading(true);
    try {
      const list = await listLessons();
      setLessons(list);
      if (list.length === 0) toast.info("Nenhuma lição encontrada — verifique os tokens");
    } catch (e: any) {
      toast.error(e.message || "Falha ao listar lições");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokens && !lessons.length && !loading) loadLessons(tokens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAll = async () => {
    if (!lessons.length) return;
    setProcessing(true);
    const map: Record<string, "pending" | "ok" | "fail"> = {};
    for (const l of lessons) {
      if (l.completed) continue;
      map[l.lessonId] = "pending";
      setStatusMap({ ...map });
      try {
        await completeLesson(l);
        map[l.lessonId] = "ok";
        toast.success(`✅ ${l.title.slice(0, 30)}`);
      } catch (e: any) {
        map[l.lessonId] = "fail";
        toast.error(`❌ ${l.title.slice(0, 30)} — ${e.message?.slice(0, 60)}`);
      }
      setStatusMap({ ...map });
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1200));
    }
    setProcessing(false);
    toast.success("Concluído");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition text-sm"
          >
            <Home className="w-4 h-4" /> Hub
          </button>
          <div className="flex items-center gap-2">
            {session && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {session.nick}
              </span>
            )}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/40 text-destructive/80 hover:bg-destructive/10 transition text-sm"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card overflow-hidden mb-6"
        >
          <div className="relative p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-brand opacity-10 pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center glow-primary shrink-0">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-bricolage mb-1">Speak</h1>
                <p className="text-muted-foreground text-sm">
                  Auto-completa lições da plataforma Efekta (Speak) da Sala do Futuro.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Aviso SSO */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            O login automático via RA <span className="text-foreground font-medium">não é possível</span> na
            plataforma Efekta (bloqueio anti-bot da Microsoft B2C). Cole os tokens abaixo — eles ficam apenas
            nesta sessão do navegador.
          </div>
        </div>

        {/* Token form */}
        {showTokenForm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-card p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-primary" />
              <h2 className="font-bold font-bricolage text-lg">Tokens do Efekta</h2>
            </div>

            <details className="mb-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-primary hover:underline">Como obter os tokens?</summary>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Abra <code>learn.better.efekta.com</code> logado normalmente.</li>
                <li>Abra o DevTools (F12) → aba <b>Application</b> → <b>Cookies</b>.</li>
                <li>Copie o valor de <code>catalyst_token</code> (obrigatório).</li>
                <li>Se quiser, copie também <code>efid_tokens.access</code> e <code>azid_token</code>.</li>
              </ol>
            </details>

            <div className="space-y-3">
              <div>
                <Label>catalyst_token <span className="text-destructive">*</span></Label>
                <Textarea value={catalyst} onChange={(e) => setCatalyst(e.target.value)} rows={3} placeholder="eyJhbGciOi..." />
              </div>
              <div>
                <Label>efid_tokens.access (opcional)</Label>
                <Textarea value={efid} onChange={(e) => setEfid(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>azid_token (opcional)</Label>
                <Textarea value={azid} onChange={(e) => setAzid(e.target.value)} rows={2} />
              </div>
              <Button onClick={saveTokens} className="w-full bg-gradient-brand text-white font-semibold py-6">
                Salvar e listar lições
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold font-bricolage text-lg">Lições encontradas</h2>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Carregando..." : `${lessons.length} lição(ões)`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => loadLessons()} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recarregar"}
                </Button>
                <Button variant="ghost" onClick={clearTokens} className="text-destructive/80">
                  Trocar tokens
                </Button>
              </div>
            </div>

            {lessons.length > 0 && (
              <>
                <div className="space-y-2 mb-4 max-h-96 overflow-auto">
                  {lessons.map((l) => {
                    const st = statusMap[l.lessonId];
                    return (
                      <div
                        key={l.lessonId}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{l.title}</div>
                          <div className="text-xs text-muted-foreground">Score: {l.score}</div>
                        </div>
                        <div className="ml-3 shrink-0">
                          {l.completed && <CheckCircle2 className="w-5 h-5 text-primary" />}
                          {st === "pending" && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                          {st === "ok" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                          {st === "fail" && <XCircle className="w-5 h-5 text-destructive" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={runAll}
                  disabled={processing}
                  className="w-full bg-gradient-brand text-white font-semibold py-6 glow-primary"
                >
                  {processing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Auto-completar todas</>
                  )}
                </Button>
              </>
            )}

            {!loading && lessons.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma lição encontrada. Os tokens podem estar expirados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Speak;
