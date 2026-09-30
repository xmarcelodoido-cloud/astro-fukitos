import { useEffect, useRef, useState } from "react";
import { PenSquare, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { OfTask, jobStatus, listRedacoes, runRedacao } from "@/lib/openfuture";
import { toast } from "sonner";

const Redacao = () => {
  useAntiInspect();
  const [items, setItems] = useState<OfTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const stop = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listRedacoes("afazer");
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível carregar as redações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => { stop.current = true; };
  }, []);

  const run = async (task: OfTask) => {
    setBusy(true);
    setLog([]);
    setProgress(0);
    try {
      const res = await runRedacao(task, 90000, 120000);
      const jobId = res.data.job_id;
      for (let i = 0; i < 180; i++) {
        if (stop.current) return;
        await new Promise((r) => setTimeout(r, 2000));
        const st = (await jobStatus(jobId)).data;
        setProgress(st.progress ?? 0);
        setLog(st.log ?? []);
        if (st.status === "done") {
          toast.success("Redação enviada como rascunho");
          load();
          return;
        }
        if (st.status === "error") {
          toast.error(st.error || "Falha ao gerar a redação");
          return;
        }
      }
      toast.info("O processamento está demorando — tente novamente depois.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao iniciar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlatformShell
      name="Redação"
      tagline="Gera e envia as redações da Sala do Futuro como rascunho."
      icon={PenSquare}
      status="available"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold font-bricolage text-lg">Redações pendentes</h2>
              <p className="text-xs text-muted-foreground">
                {loading ? "Carregando..." : `${items.length} redação(ões)`}
              </p>
            </div>
            <Button variant="outline" onClick={load} disabled={loading || busy}>Atualizar</Button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Buscando redações...
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma redação pendente no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    {t.due && (
                      <div className="text-xs text-muted-foreground">
                        Entrega: {new Date(t.due).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => run(t)} className="bg-gradient-brand text-primary-foreground">
                    <Play className="w-3 h-3 mr-1" /> Gerar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(busy || log.length > 0) && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              {busy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
              <h3 className="font-bold font-bricolage">Progresso — {progress}%</h3>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
              <div className="h-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-1 max-h-48 overflow-auto text-xs text-muted-foreground font-mono">
              {log.map((l, i) => <div key={i}>› {l}</div>)}
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  );
};

export default Redacao;
