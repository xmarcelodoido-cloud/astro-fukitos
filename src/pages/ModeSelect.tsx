import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Brain, BookOpen, PenSquare, Calculator, Sparkles, Heart, User, Mic,
  LogOut, Home, LayoutGrid, CheckCircle2, Users, Activity, CalendarCheck,
} from "lucide-react";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { useSession } from "@/contexts/SessionContext";
import { DashboardData, getDashboard } from "@/lib/openfuture";

type Platform = { name: string; description: string; icon: typeof Zap; href: string; status: "ativa" | "em breve" };

const platforms: Platform[] = [
  { name: "TarefaSP", description: "Resolve as tarefas da Sala do Futuro", icon: Zap, href: "/automatico", status: "ativa" },
  { name: "Tutor IA", description: "Estude cada questão com a IA", icon: Brain, href: "/ia", status: "ativa" },
  { name: "Speak", description: "Auto-completa lições da Efekta", icon: Mic, href: "/speak", status: "ativa" },
  { name: "Redação", description: "Gera redações como rascunho", icon: PenSquare, href: "/redacao", status: "ativa" },
  { name: "LeiaSP", description: "Leituras resolvidas em segundos", icon: BookOpen, href: "/leia", status: "ativa" },
  { name: "Matific", description: "Atividades de matemática", icon: Calculator, href: "/matific", status: "ativa" },
  { name: "Khan Academy", description: "Exercícios da Khan", icon: Sparkles, href: "/khan", status: "em breve" },
];

const nav = [
  { label: "Início", icon: Home, href: "/" },
  { label: "TarefaSP", icon: Zap, href: "/automatico" },
  { label: "Tutor IA", icon: Brain, href: "/ia" },
  { label: "Redação", icon: PenSquare, href: "/redacao" },
  { label: "Speak", icon: Mic, href: "/speak" },
  { label: "Perfil", icon: User, href: "/perfil" },
];

const readJson = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

const PlatformCard = ({ p, onClick }: { p: Platform; onClick: () => void }) => {
  const Icon = p.icon;
  const active = p.status === "ativa";
  return (
    <motion.button
      whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="group text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/60 transition card-shadow"
    >
      <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">{p.name}</div>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-brand ${active ? "glow-primary" : "grayscale opacity-60"}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-bold font-bricolage text-foreground truncate">{p.name}</div>
          <div className={`text-xs flex items-center gap-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`} />
            {active ? "automação ativa" : "em breve"}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.description}</p>
    </motion.button>
  );
};

const ModeSelect = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session, logout } = useSession();
  const [adminClicks, setAdminClicks] = useState(0);
  const [amount, setAmount] = useState(10);
  useAntiInspect();

  const stats = useMemo(() => readJson("astrokitos_local_stats", { tasksCompleted: 0, aiSessions: 0 }), []);
  const accounts = useMemo(() => readJson<unknown[]>("fukitos_saved_accounts", []).length, []);
  const activeCount = platforms.filter((p) => p.status === "ativa").length;
  const nick = session?.nick || "Aluno";

  const handleAdminClick = () => {
    const next = adminClicks + 1;
    setAdminClicks(next);
    if (next >= 3) navigate("/admin-login");
    setTimeout(() => setAdminClicks(0), 1500);
  };

  const doLogout = () => { logout(); navigate("/login"); };

  const [remote, setRemote] = useState<DashboardData | null>(null);
  useEffect(() => {
    if (!session?.ofConnected) return;
    getDashboard().then(setRemote).catch(() => {});
  }, [session?.ofConnected]);

  const statCards = remote?.stats
    ? [
        { label: "Tarefas pendentes", value: remote.stats.tarefas ?? 0, sub: "na Sala do Futuro", icon: CheckCircle2 },
        { label: "Redações", value: remote.stats.redacoes ?? 0, sub: "a entregar", icon: Brain },
        { label: "Mensagens", value: remote.stats.mensagens ?? 0, sub: "não lidas", icon: Users },
        { label: "Plataformas", value: `${activeCount}/${platforms.length}`, sub: "ativas agora", icon: Activity },
      ]
    : [
        { label: "Tarefas feitas", value: stats.tasksCompleted, sub: "neste dispositivo", icon: CheckCircle2 },
        { label: "Sessões IA", value: stats.aiSessions, sub: "estudos com o tutor", icon: Brain },
        { label: "Contas", value: accounts, sub: "salvas no aparelho", icon: Users },
        { label: "Plataformas", value: `${activeCount}/${platforms.length}`, sub: "ativas agora", icon: Activity },
      ];

  return (
    <div className="min-h-screen bg-background flex">
      <button onClick={handleAdminClick} className="fixed bottom-1 right-1 w-3 h-3 rounded-full opacity-0 z-50" aria-label=" " tabIndex={-1} />

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center glow-primary">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold font-bricolage text-gradient text-lg leading-none">Astrokitos</div>
            <div className="text-[10px] text-primary flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> online</div>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {nav.map((n) => {
            const Icon = n.icon; const on = pathname === n.href;
            return (
              <button key={n.href} onClick={() => navigate(n.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${on ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <Icon className="w-4 h-4" /> {n.label}
              </button>
            );
          })}
          <div className="pt-4 text-[10px] uppercase tracking-widest text-muted-foreground px-3">Plataformas</div>
          {platforms.filter((p) => p.status === "em breve").map((p) => (
            <button key={p.href} onClick={() => navigate(p.href)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
              <LayoutGrid className="w-4 h-4" /> {p.name}
            </button>
          ))}
        </nav>
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-3 px-2">
            {session?.identity?.avatar_url ? (
              <img src={session.identity.avatar_url} alt={nick} className="w-9 h-9 rounded-full object-cover border border-primary/40" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center font-bold text-primary-foreground">{nick[0]}</div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{nick}</div>
              <div className="text-[10px] text-primary">Conectado</div>
            </div>
          </div>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4" /> Trocar de conta
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between">
            <span className="font-bold font-bricolage text-gradient text-xl">Astrokitos</span>
            <button onClick={doLogout} className="text-destructive"><LogOut className="w-5 h-5" /></button>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Greeting */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 relative rounded-3xl border border-border bg-card overflow-hidden p-6 md:p-8">
              <div className="absolute inset-0 bg-gradient-brand opacity-10 pointer-events-none" />
              <div className="relative">
                <p className="text-muted-foreground">{greeting()},</p>
                <h1 className="text-3xl md:text-5xl font-bold font-bricolage text-gradient uppercase break-words">{nick}</h1>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">RA {session?.ra ?? "—"} · Sala do Futuro</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button onClick={() => navigate("/automatico")} className="px-4 py-2 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold glow-primary">Fazer tarefas</button>
                  <button onClick={() => navigate("/ia")} className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10">Estudar com IA</button>
                </div>
              </div>
            </motion.section>

            {/* Donation */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-3xl border border-primary/30 bg-card p-6">
              <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2"><Heart className="w-4 h-4" /> Apoie o projeto</div>
              <h3 className="font-bold font-bricolage text-lg text-foreground">Ajude a manter o Astrokitos no ar</h3>
              <p className="text-xs text-muted-foreground mt-1">Tudo é de graça — sua doação paga os servidores e a IA criada pelo Zenos.</p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[5, 10, 25].map((v) => (
                  <button key={v} onClick={() => setAmount(v)}
                    className={`py-2 rounded-lg text-sm font-semibold border transition ${amount === v ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>R$ {v}</button>
                ))}
              </div>
              <a href="https://pixgg.com/zenin" target="_blank" rel="noopener noreferrer"
                className="mt-3 block text-center py-2.5 rounded-xl bg-gradient-brand text-primary-foreground font-semibold text-sm">Doar via Pix</a>
            </motion.section>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <div className="text-2xl font-bold font-bricolage text-gradient">{s.value}</div>
                  <div className="text-sm font-semibold text-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Agenda */}
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="font-semibold text-foreground">Agenda</div>
              <div className="text-xs text-muted-foreground">Abra o TarefaSP para ver as atividades pendentes da sua turma.</div>
            </div>
          </div>

          {/* Mais acessadas */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <h2 className="text-xl font-bold font-bricolage text-foreground">Mais acessadas</h2>
              <span className="text-xs text-muted-foreground">todas as plataformas</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {platforms.filter((p) => p.status === "ativa").map((p) => <PlatformCard key={p.href} p={p} onClick={() => navigate(p.href)} />)}
            </div>
          </section>

          {/* Suas plataformas */}
          <section>
            <h2 className="text-xl font-bold font-bricolage text-foreground mb-3">Suas plataformas</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {platforms.map((p) => <PlatformCard key={p.href} p={p} onClick={() => navigate(p.href)} />)}
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground pt-4">Astrokitos · feito por <span className="text-primary">Zenos</span></p>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur grid grid-cols-5">
        {nav.slice(0, 5).map((n) => {
          const Icon = n.icon; const on = pathname === n.href;
          return (
            <button key={n.href} onClick={() => navigate(n.href)} className={`py-3 flex flex-col items-center gap-1 text-[10px] ${on ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="w-5 h-5" /> {n.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default ModeSelect;
