import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, CalendarDays, GraduationCap, ClipboardList, UserCheck } from "lucide-react";
import { sedRequest, asList, pick, weekRange, SedAction } from "@/lib/sed";

type Kind = "boletim" | "notas" | "frequencia" | "agenda";
const META: Record<Kind, { title: string; desc: string; icon: any }> = {
  boletim: { title: "Boletim", desc: "Notas, faltas e médias por disciplina e bimestre.", icon: GraduationCap },
  notas: { title: "Notas", desc: "Provas e trabalhos lançados por disciplina.", icon: ClipboardList },
  frequencia: { title: "Faltas e presença", desc: "Suas faltas e porcentagem de frequência.", icon: UserCheck },
  agenda: { title: "Agenda", desc: "Aulas e eventos das próximas duas semanas.", icon: CalendarDays },
};

const fmtDate = (v: any) => { if (!v) return ""; const d = new Date(v); return isNaN(+d) ? String(v) : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };

export default function Escola({ kind }: { kind: Kind }) {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [bim, setBim] = useState<string>("todos");
  const M = META[kind];

  async function load() {
    setLoading(true); setErr("");
    try {
      let d: any;
      if (kind === "agenda") d = await sedRequest("agenda", weekRange());
      else if (kind === "frequencia") {
        d = await sedRequest("faltas").catch(() => sedRequest("frequencia"));
      } else d = await sedRequest(kind as SedAction);
      setRows(asList(d));
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setRows([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [kind]);

  const bimOf = (r: any) => String(pick(r, "bimestre", "numeroBimestre", "bimestreNumero", "Bimestre") ?? "");
  const bims = [...new Set(rows.map(bimOf).filter(Boolean))].sort();
  const shown = kind === "agenda" || kind === "frequencia" || bim === "todos" ? rows : rows.filter((r) => bimOf(r) === bim);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <button onClick={() => nav("/")} className="liquid-glass inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm"><ArrowLeft size={16} /> Voltar</button>
        <header className="rounded-3xl bg-foreground text-background p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-brand grid place-items-center text-primary-foreground"><M.icon /></div>
            <div><h1 className="text-2xl font-bold font-bricolage">{M.title}</h1><p className="text-sm opacity-70">{M.desc}</p></div>
          </div>
          <button onClick={load} aria-label="Atualizar" className="p-3 rounded-xl bg-primary text-primary-foreground"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
        </header>

        {bims.length > 1 && kind !== "agenda" && (
          <div className="flex flex-wrap gap-2">
            {["todos", ...bims].map((b) => (
              <button key={b} onClick={() => setBim(b)} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${bim === b ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{b === "todos" ? "Todos" : `${b}º Bim`}</button>
            ))}
          </div>
        )}

        {err && <div className="rounded-2xl border border-destructive/40 bg-card p-5"><p className="font-semibold">Não foi possível carregar</p><p className="text-sm text-muted-foreground mt-1">{err}</p></div>}
        {loading && <p className="text-muted-foreground">Carregando…</p>}
        {!loading && !err && shown.length === 0 && <div className="rounded-2xl bg-card border border-border p-6 text-muted-foreground">Nada lançado ainda para este período.</div>}

        <div className="grid gap-3">
          {shown.map((r, i) => {
            if (kind === "agenda") return (
              <article key={i} className="rounded-2xl bg-card border border-border p-4 flex gap-4">
                <div className="min-w-[90px] text-primary font-bold text-sm capitalize">{fmtDate(pick(r, "dataInicio", "data"))}</div>
                <div><p className="font-semibold">{pick(r, "descricaoEvento", "nomeDisciplina", "descricaoTipoEvento") ?? "Evento"}</p>
                  <p className="text-sm text-muted-foreground">{pick(r, "descricaoTipoEvento", "descricaoTurma") ?? ""}</p></div>
              </article>
            );
            if (kind === "frequencia") {
              const f = Number(pick(r, "porcentagemFrequencia", "frequencia") ?? 0);
              return (
                <article key={i} className="rounded-2xl bg-card border border-border p-5 space-y-3">
                  <div className="flex justify-between"><p className="font-semibold">{pick(r, "nomeDisciplina", "disciplina") ?? "Bimestre atual"}</p><p className="font-bold">{pick(r, "totalFaltasBimestre", "faltas") ?? 0} faltas</p></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-brand" style={{ width: `${Math.min(100, f)}%` }} /></div>
                  <p className="text-sm text-muted-foreground">Frequência: {f}% {f < 75 && "· abaixo do mínimo (75%)"}</p>
                </article>
              );
            }
            const nota = pick(r, "nota", "media", "notaFinal", "valorNota");
            const n = Number(nota);
            return (
              <article key={i} className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3">
                <div><p className="font-semibold">{pick(r, "nomeDisciplina", "disciplina", "nomeAvaliacao") ?? "Disciplina"}</p>
                  <p className="text-sm text-muted-foreground">{[kind === "notas" ? pick(r, "nomeAvaliacao", "descricao") : null, bimOf(r) && `${bimOf(r)}º bimestre`, kind === "boletim" && pick(r, "faltas", "totalFaltas") != null ? `${pick(r, "faltas", "totalFaltas")} faltas` : null].filter(Boolean).join(" · ")}</p></div>
                <span className={`text-xl font-bold px-3 py-1 rounded-xl ${nota == null ? "text-muted-foreground" : n >= 6 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{nota ?? "—"}</span>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
