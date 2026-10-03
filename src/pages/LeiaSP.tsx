import { useEffect, useState } from "react";
import { BookOpen, Loader2, CheckCircle2, XCircle, Play } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { LeiaBook, listLeia, runLeia } from "@/lib/openfuture";
import { toast } from "sonner";

const LeiaSP = () => {
  useAntiInspect();
  const [books, setBooks] = useState<LeiaBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Record<string, "run" | "ok" | "fail">>({});
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listLeia();
      setBooks(res.items || []);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível carregar o LeiaSP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (b: LeiaBook) => {
    setBusy(true);
    setStatus((s) => ({ ...s, [b.id]: "run" }));
    try {
      await runLeia(b);
      setStatus((s) => ({ ...s, [b.id]: "ok" }));
      toast.success(`✅ ${b.title.slice(0, 32)}`);
    } catch (e: any) {
      setStatus((s) => ({ ...s, [b.id]: "fail" }));
      toast.error(e.message || "Falha ao concluir a leitura");
    } finally {
      setBusy(false);
    }
  };

  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PlatformShell
      name="LeiaSP"
      tagline="Conclui as leituras e os quizzes do LeiaSP em segundos."
      icon={BookOpen}
      status="available"
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="font-bold font-bricolage text-lg">Livros disponíveis</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${filtered.length} livro(s)`}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livro..."
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary/60"
            />
            <Button variant="outline" onClick={load} disabled={loading}>Atualizar</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Buscando livros...
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum livro encontrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 max-h-[30rem] overflow-auto">
            {filtered.map((b) => {
              const st = status[b.id];
              return (
                <div key={b.id} className="flex gap-3 p-3 rounded-xl border border-border bg-background/50">
                  {b.img && (
                    <img src={b.img} alt={b.title} className="w-12 h-16 object-cover rounded-md shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{b.title}</div>
                    {b.sub && <div className="text-xs text-muted-foreground truncate">{b.sub}</div>}
                    {typeof b.progress === "number" && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-brand" style={{ width: `${Math.min(100, b.progress)}%` }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {b.progress}% lido{b.pages ? ` · ${b.pages} páginas` : ""}{b.quiz ? (b.quizDone ? " · quiz feito" : " · tem quiz") : ""}
                        </div>
                      </div>
                    )}
                    <div className="mt-2">
                      {st === "run" ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : st === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 className="w-4 h-4" /> Concluído
                        </span>
                      ) : st === "fail" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="w-4 h-4" /> Falhou
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(b)}>
                          <Play className="w-3 h-3 mr-1" /> Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformShell>
  );
};

export default LeiaSP;
