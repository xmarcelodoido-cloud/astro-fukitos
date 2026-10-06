import { useEffect, useState } from "react";
import { BookOpen, Loader2, LogOut, Link2, Gauge, ExternalLink } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { getLeiaToken, setLeiaToken, parseLeiaLink, leiaGet, normalizeBooks, LeiaItem } from "@/lib/leiasp";
import { toast } from "sonner";

const LeiaSP = () => {
  useAntiInspect();
  const [connected, setConnected] = useState(!!getLeiaToken());
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [thermo, setThermo] = useState<any>(null);
  const [assigned, setAssigned] = useState<LeiaItem[]>([]);
  const [catalog, setCatalog] = useState<LeiaItem[]>([]);
  const [grade, setGrade] = useState("9");
  const [tab, setTab] = useState<"assigned" | "catalog">("assigned");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, a, c] = await Promise.allSettled([
        leiaGet("/v1/student/thermometer"),
        leiaGet("/v1/student/assignments/received"),
        leiaGet(`/v1/library/discover/?grade=${grade}`),
      ]);
      if (t.status === "fulfilled") setThermo(t.value);
      if (a.status === "fulfilled") setAssigned(normalizeBooks(a.value));
      if (c.status === "fulfilled") setCatalog(normalizeBooks(c.value));
      const err = [t, a, c].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (err) toast.error(err.reason?.message || "Erro no Leia SP");
      if (!getLeiaToken()) setConnected(false);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (connected) load(); }, [connected, grade]);

  const connect = () => {
    const tk = parseLeiaLink(link);
    if (!tk) return toast.error("Link inválido. Cole o link completo do Leia SP (com ?t=).");
    setLeiaToken(tk); setLink(""); setConnected(true);
    toast.success("Leia SP conectado");
  };
  const disconnect = () => { setLeiaToken(null); setConnected(false); setThermo(null); setAssigned([]); setCatalog([]); };

  const list = (tab === "assigned" ? assigned : catalog).filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));
  const tGoal = thermo?.goal ?? thermo?.weeklyGoal ?? thermo?.data?.goal;
  const tDone = thermo?.minutes ?? thermo?.readMinutes ?? thermo?.current ?? thermo?.data?.minutes;

  return (
    <PlatformShell name="LeiaSP" tagline="Sua biblioteca oficial do Leia SP dentro do Astro G." icon={BookOpen} status="available">
      {!connected ? (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-bold font-bricolage text-lg flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Conectar Leia SP</h2>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Na Sala do Futuro, clique no card do Leia SP.</li>
            <li>Quando abrir, copie o link da barra de endereço (começa com em.elefanteletrado.com.br/?t=).</li>
            <li>Cole aqui embaixo. O acesso vale por 1 hora e fica só nesta aba.</li>
          </ol>
          <div className="flex gap-2 flex-wrap">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://em.elefanteletrado.com.br/?t=..."
              className="flex-1 min-w-[16rem] px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary/60" />
            <Button onClick={connect}>Conectar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Gauge className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">Termômetro de leitura</div>
                <div className="text-xs text-muted-foreground">
                  {thermo ? (tGoal != null ? `${tDone ?? 0} de ${tGoal} min nesta semana` : "Dados carregados") : loading ? "Carregando..." : "Sem dados"}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect}><LogOut className="w-4 h-4 mr-1" /> Desconectar</Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex gap-2">
                <Button size="sm" variant={tab === "assigned" ? "default" : "outline"} onClick={() => setTab("assigned")}>Recebidos ({assigned.length})</Button>
                <Button size="sm" variant={tab === "catalog" ? "default" : "outline"} onClick={() => setTab("catalog")}>Catálogo ({catalog.length})</Button>
              </div>
              <div className="flex gap-2">
                {tab === "catalog" && (
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className="px-2 py-2 rounded-lg bg-background border border-border text-sm">
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => <option key={g} value={g}>{g}º ano</option>)}
                  </select>
                )}
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar livro..."
                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary/60" />
                <Button variant="outline" onClick={load} disabled={loading}>Atualizar</Button>
              </div>
            </div>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Buscando livros...</div>
            ) : list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum livro encontrado.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 max-h-[30rem] overflow-auto">
                {list.map((b) => (
                  <div key={b.id} className="flex gap-3 p-3 rounded-xl border border-border bg-background/50">
                    {b.img && <img src={b.img} alt={b.title} className="w-12 h-16 object-cover rounded-md shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{b.title}</div>
                      {b.sub && <div className="text-xs text-muted-foreground truncate">{b.sub}</div>}
                      {typeof b.progress === "number" && (
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-brand" style={{ width: `${Math.min(100, b.progress)}%` }} />
                        </div>
                      )}
                      <a href={`https://em.elefanteletrado.com.br/`} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> Ler no Leia SP
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PlatformShell>
  );
};

export default LeiaSP;
