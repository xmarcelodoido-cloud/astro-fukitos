import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Brain, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";

const ModeSelect = () => {
  const navigate = useNavigate();
  const [adminClicks, setAdminClicks] = useState(0);

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
        className="absolute top-4 right-4 p-2 opacity-30 hover:opacity-60 transition"
        aria-label="hidden"
      >
        <Shield size={16} className="text-muted-foreground" />
      </button>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16 max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 font-bricolage">
            <span className="text-gradient">Astrokitos</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground mb-2">
            Sua plataforma de estudos inteligente
          </p>
          <p className="text-sm md:text-base text-muted-foreground/80">
            Escolha como deseja resolver suas atividades hoje
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl">
          {/* Modo Automático */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => navigate("/automatico")}
            className="group cursor-pointer relative"
          >
            <div className="absolute inset-0 bg-gradient-brand rounded-2xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            <div className="relative bg-card border border-border rounded-2xl p-8 md:p-10 h-full flex flex-col justify-between hover:border-primary/60 transition-all duration-300 card-shadow">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-brand flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 glow-primary">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-bricolage">
                  Modo Automático
                </h2>
                <p className="text-sm text-muted-foreground">
                  Completa suas atividades automaticamente
                </p>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Processa múltiplas atividades de uma vez</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Configure nota desejada e tempo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Ideal para quem tem pressa</span>
                </li>
              </ul>

              <button className="w-full bg-gradient-brand text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition">
                Começar Automático
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Modo IA Educativo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => navigate("/ia")}
            className="group cursor-pointer relative"
          >
            <div className="absolute inset-0 bg-gradient-brand-reverse rounded-2xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            <div className="relative bg-card border border-border rounded-2xl p-8 md:p-10 h-full flex flex-col justify-between hover:border-accent/60 transition-all duration-300 card-shadow">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-brand-reverse flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 glow-primary">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-bricolage">
                  Modo IA Educativo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aprenda com tutoria pedagógica inteligente
                </p>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>IA tutora guia seu raciocínio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Dicas progressivas em 3 níveis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Aprenda de verdade, não apenas respostas</span>
                </li>
              </ul>

              <button className="w-full bg-gradient-brand-reverse text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition">
                Começar com IA
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted-foreground/70 mt-10">
          Ambos os modos usam a mesma autenticação segura da Sala do Futuro
        </p>
      </div>
    </div>
  );
};

export default ModeSelect;
