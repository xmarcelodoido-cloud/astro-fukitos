import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  User,
  Trash2,
  LogOut,
  ShieldCheck,
  Activity,
  Star,
  Award,
} from "lucide-react";
import { useAntiInspect } from "@/hooks/useAntiInspect";

interface SavedAccount {
  ra: string;
  studentName: string;
  savedAt: string;
}

const ACCOUNTS_KEY = "fukitos_saved_accounts";
const STATS_KEY = "astrokitos_local_stats";

interface LocalStats {
  tasksCompleted: number;
  aiSessions: number;
  lastLogin: string | null;
}

const loadStats = (): LocalStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return { tasksCompleted: 0, aiSessions: 0, lastLogin: null };
};

const Perfil = () => {
  useAntiInspect();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [stats] = useState<LocalStats>(loadStats());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (raw) setAccounts(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const removeAccount = (ra: string) => {
    const next = accounts.filter((a) => a.ra !== ra);
    setAccounts(next);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  };

  const clearAll = () => {
    setAccounts([]);
    localStorage.removeItem(ACCOUNTS_KEY);
    localStorage.removeItem(STATS_KEY);
  };

  const primary = accounts[0];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition text-sm"
          >
            <Home className="w-4 h-4" /> Hub
          </button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-border bg-card overflow-hidden mb-6"
        >
          <div className="absolute inset-0 bg-gradient-brand opacity-10 pointer-events-none" />
          <div className="relative p-6 md:p-10 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center glow-primary shrink-0">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[11px] font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3 h-3" /> Perfil local
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-bricolage text-foreground truncate">
                {primary?.studentName ?? "Visitante"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {primary ? `RA ${primary.ra}` : "Nenhuma conta salva neste dispositivo"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <StatCard icon={Activity} label="Tarefas feitas" value={stats.tasksCompleted} />
          <StatCard icon={Star} label="Sessões IA" value={stats.aiSessions} />
          <StatCard icon={Award} label="Contas salvas" value={accounts.length} />
        </div>

        {/* Accounts list */}
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-bricolage">Contas salvas</h2>
            {accounts.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Limpar tudo
              </button>
            )}
          </div>

          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma conta salva. Ao fazer login em qualquer plataforma seu RA fica
              disponível aqui.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.ra}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {a.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      RA {a.ra} · salvo em {new Date(a.savedAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAccount(a.ra)}
                    className="p-2 text-muted-foreground hover:text-destructive transition"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground/70">
          Perfil salvo apenas neste dispositivo. Nada é enviado para servidores.
        </p>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 md:p-5 text-center">
    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 mx-auto flex items-center justify-center mb-2">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="text-2xl md:text-3xl font-bold text-gradient font-bricolage">{value}</div>
    <div className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">
      {label}
    </div>
  </div>
);

export default Perfil;
