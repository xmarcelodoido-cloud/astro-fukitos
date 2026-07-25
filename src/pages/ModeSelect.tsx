import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  BookOpen,
  PenSquare,
  Calculator,
  Sparkles,
  ArrowRight,
  Heart,
  ShieldCheck,
  User,
  Mic,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { useSession } from "@/contexts/SessionContext";

type Platform = {
  name: string;
  description: string;
  icon: typeof Zap;
  href?: string;
  available: boolean;
  accent: "primary" | "accent";
  badge?: string;
};

const platforms: Platform[] = [
  {
    name: "TarefaSP",
    description: "Resolve automaticamente as tarefas da Sala do Futuro",
    icon: Zap,
    href: "/automatico",
    available: true,
    accent: "primary",
    badge: "Rápido",
  },
  {
    name: "Tutor IA",
    description: "Estude com uma IA que te explica cada questão passo a passo",
    icon: Brain,
    href: "/ia",
    available: true,
    accent: "accent",
    badge: "Educativo",
  },
  {
    name: "LeiaSP",
    description: "Leituras e atividades resolvidas em segundos",
    icon: BookOpen,
    href: "/leia",
    available: true,
    accent: "primary",
    badge: "Em breve",
  },
  {
    name: "Redação",
    description: "Gera e envia redações como rascunho na Sala do Futuro",
    icon: PenSquare,
    href: "/redacao",
    available: true,
    accent: "accent",
    badge: "Em breve",
  },
  {
    name: "Matific",
    description: "Resolve as atividades de matemática do Matific",
    icon: Calculator,
    href: "/matific",
    available: true,
    accent: "primary",
    badge: "Em breve",
  },
  {
    name: "Khan Academy",
    description: "Resolução automática de exercícios da Khan",
    icon: Sparkles,
    href: "/khan",
    available: true,
    accent: "accent",
    badge: "Em breve",
  },
  {
    name: "Speak",
    description: "Auto-completa lições da plataforma Efekta (Speak)",
    icon: Mic,
    href: "/speak",
    available: true,
    accent: "accent",
    badge: "Novo",
  },
];

const ModeSelect = () => {
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const [adminClicks, setAdminClicks] = useState(0);
  useAntiInspect();

  const handleAdminClick = () => {
    const next = adminClicks + 1;
    setAdminClicks(next);
    if (next >= 3) navigate("/admin-login");
    setTimeout(() => setAdminClicks(0), 1500);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      {/* Hidden admin trigger */}
      <button
        onClick={handleAdminClick}
        className="fixed bottom-1 right-1 w-3 h-3 rounded-full opacity-0 hover:opacity-10 transition z-50 select-none"
        aria-label=" "
        tabIndex={-1}
      />

      <div className="relative z-10 container mx-auto px-4 py-10 md:py-14 max-w-6xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold font-bricolage text-gradient">
              Astrokitos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/perfil")}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition text-sm font-medium"
            >
              <User className="w-4 h-4" /> <span className="hidden sm:inline">Perfil</span>
            </button>
            <a
              href="https://pixgg.com/zenin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition text-sm font-medium"
            >
              <Heart className="w-4 h-4" /> <span className="hidden sm:inline">Apoiar</span>
            </a>
          </div>
        </motion.header>

        {/* Welcome card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative rounded-3xl border border-border bg-card overflow-hidden mb-6"
        >
          <div className="absolute inset-0 bg-gradient-brand opacity-10 pointer-events-none" />
          <div className="relative p-6 md:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Plataforma segura & anônima
            </div>
            <h1 className="text-3xl md:text-5xl font-bold font-bricolage mb-3">
              Bem-vindo ao <span className="text-gradient">Astrokitos</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Escolha uma plataforma abaixo para resolver, estudar ou automatizar suas
              atividades da Sala do Futuro — tudo em minutos, do seu jeito.
            </p>
          </div>
        </motion.section>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
          {[
            { label: "Plataformas", value: `${platforms.length}` },
            {
              label: "Ativas",
              value: `${platforms.filter((p) => p.badge !== "Em breve").length}`,
            },
            {
              label: "Em breve",
              value: `${platforms.filter((p) => p.badge === "Em breve").length}`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-4 md:p-5 text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-gradient font-bricolage">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Platforms */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold font-bricolage">
              Plataformas
            </h2>
            <span className="text-xs text-muted-foreground">
              Toque em uma para começar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((p, i) => {
              const Icon = p.icon;
              const disabled = !p.available;
              return (
                <motion.button
                  key={p.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  whileHover={disabled ? undefined : { y: -3 }}
                  whileTap={disabled ? undefined : { scale: 0.98 }}
                  onClick={() => !disabled && p.href && navigate(p.href)}
                  disabled={disabled}
                  className={`group relative text-left rounded-2xl border p-5 transition-all overflow-hidden ${
                    disabled
                      ? "border-border bg-card/60 cursor-not-allowed opacity-60"
                      : "border-border bg-card hover:border-primary/60 card-shadow"
                  }`}
                >
                  {!disabled && (
                    <div
                      className={`absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                        p.accent === "primary"
                          ? "bg-gradient-brand"
                          : "bg-gradient-brand-reverse"
                      }`}
                      style={{ padding: 1, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" as any }}
                    />
                  )}

                  <div className="relative flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        p.accent === "primary"
                          ? "bg-gradient-brand"
                          : "bg-gradient-brand-reverse"
                      } ${disabled ? "grayscale" : "glow-primary"}`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold font-bricolage text-lg text-foreground truncate">
                          {p.name}
                        </h3>
                        {p.badge && !disabled && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wider">
                            {p.badge}
                          </span>
                        )}
                        {disabled && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                            Em breve
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {p.description}
                      </p>
                      {!disabled && (
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                          Acessar <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground/70 mt-10">
          Feito com <span className="text-primary">♥</span> por Zenos · Todas as
          plataformas usam autenticação segura da Sala do Futuro
        </p>
      </div>
    </div>
  );
};

export default ModeSelect;
