import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Sparkles, Clock } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface PlatformShellProps {
  name: string;
  tagline: string;
  icon: LucideIcon;
  accent?: "primary" | "accent";
  status?: "available" | "soon" | "beta";
  children?: ReactNode;
}

/**
 * Shell padronizado para páginas de plataforma no tema Astrokitos.
 * Header com logo, botão voltar, hero com nome + tagline e slot para conteúdo.
 */
export const PlatformShell = ({
  name,
  tagline,
  icon: Icon,
  accent = "primary",
  status = "soon",
  children,
}: PlatformShellProps) => {
  const navigate = useNavigate();
  const gradient =
    accent === "primary" ? "bg-gradient-brand" : "bg-gradient-brand-reverse";

  const statusBadge =
    status === "available"
      ? { label: "Ativo", cls: "bg-primary/15 border-primary/30 text-primary" }
      : status === "beta"
      ? { label: "Beta", cls: "bg-accent/15 border-accent/30 text-accent" }
      : { label: "Em desenvolvimento", cls: "bg-muted border-border text-muted-foreground" };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-5xl">
        {/* Top bar */}
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
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Hub</span>
          </button>
        </div>

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl border border-border bg-card overflow-hidden mb-8"
        >
          <div className={`absolute inset-0 ${gradient} opacity-10 pointer-events-none`} />
          <div className="relative p-6 md:p-10 flex items-start gap-5">
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${gradient} flex items-center justify-center glow-primary shrink-0`}
            >
              <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider mb-2 ${statusBadge.cls}`}
              >
                <Sparkles className="w-3 h-3" /> {statusBadge.label}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold font-bricolage text-foreground leading-tight">
                {name}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">{tagline}</p>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        {children ?? <ComingSoonBody platformName={name} />}
      </div>
    </div>
  );
};

const ComingSoonBody = ({ platformName }: { platformName: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="grid gap-4 md:grid-cols-2"
  >
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold font-bricolage">Em construção</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        O <strong className="text-foreground">{platformName}</strong> está sendo
        desenvolvido. A integração automática chegará em breve e todo o fluxo já
        vai estar no visual do Astrokitos.
      </p>
    </div>

    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <h3 className="text-lg font-bold font-bricolage">O que virá</h3>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2"><span className="text-primary">✓</span> Login com RA da Sala do Futuro</li>
        <li className="flex gap-2"><span className="text-primary">✓</span> Listagem e execução automática</li>
        <li className="flex gap-2"><span className="text-primary">✓</span> Log de progresso no perfil</li>
      </ul>
    </div>
  </motion.div>
);

export default PlatformShell;
