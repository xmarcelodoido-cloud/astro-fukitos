import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntroFlowProps {
  storageKey: string; // ex: "astrokitos_intro_automatico"
  onDone: () => void;
}

/**
 * Sequência ao entrar em um modo:
 *  1. Tela 100% preta (~1.2s)
 *  2. Modal de Termo de Uso (Aceitar / Recusar)
 *  3. Loading com chip animado (~1.6s)
 *  4. onDone()
 *
 * Usa sessionStorage para não repetir na mesma sessão de navegação.
 */
export const IntroFlow = ({ storageKey, onDone }: IntroFlowProps) => {
  const [phase, setPhase] = useState<"black" | "terms" | "loading" | "done">(
    () => {
      try {
        if (sessionStorage.getItem(storageKey) === "ok") return "done";
      } catch { /* ignore */ }
      return "black";
    }
  );

  useEffect(() => {
    if (phase === "done") {
      onDone();
      return;
    }
    if (phase === "black") {
      const t = setTimeout(() => setPhase("terms"), 1100);
      return () => clearTimeout(t);
    }
    if (phase === "loading") {
      const t = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, "ok");
        } catch { /* ignore */ }
        setPhase("done");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase, onDone, storageKey]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "black" && (
          <motion.div
            key="black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black"
          />
        )}

        {phase === "terms" && (
          <motion.div
            key="terms"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="relative w-4/5 max-w-[320px] rounded-2xl bg-[#0f0f0f] border border-primary/30"
            style={{
              boxShadow:
                "rgba(60,64,67,0.3) 0 1px 2px 0, rgba(251,161,44,0.18) 0 2px 18px 2px",
            }}
          >
            <div className="flex flex-col items-center justify-between pt-9 px-6 pb-6 relative">
              <span className="relative mx-auto -mt-16 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  ⚡
                </div>
              </span>

              <h5 className="text-sm font-semibold mb-2 text-left mr-auto text-foreground font-bricolage">
                Termo de uso do Astrokitos
              </h5>

              <p className="w-full mb-4 text-xs text-justify text-muted-foreground leading-relaxed">
                Ao clicar em <span className="text-primary font-semibold">Aceitar</span>, você
                concorda com nossos termos de uso e regras. O uso da plataforma é
                de sua inteira responsabilidade.
                <br />
                <a className="mt-2 inline-block text-primary underline underline-offset-2 cursor-pointer hover:text-accent">
                  Saiba mais
                </a>
              </p>

              <div className="flex w-full items-center justify-between mt-2">
                <button
                  onClick={() => (window.location.href = "https://google.com")}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors font-semibold"
                >
                  Recusar
                </button>
                <button
                  onClick={() => setPhase("loading")}
                  className="font-semibold cursor-pointer py-2 px-8 break-keep text-sm rounded-lg transition-colors text-white"
                  style={{ background: "var(--gradient-brand)" }}
                  type="button"
                >
                  Aceitar
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            <ChipLoader />
            <p className="text-primary mt-4 text-sm tracking-[0.3em] font-bricolage animate-pulse">
              CARREGANDO...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChipLoader = () => (
  <svg
    viewBox="0 0 800 500"
    xmlns="http://www.w3.org/2000/svg"
    className="w-[min(90vw,520px)]"
  >
    <defs>
      <linearGradient id="chipGradientAk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2d2d2d" />
        <stop offset="100%" stopColor="#0f0f0f" />
      </linearGradient>
      <linearGradient id="textGradientAk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fba12c" />
        <stop offset="100%" stopColor="#e96e14" />
      </linearGradient>
      <linearGradient id="pinGradientAk" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="#bbbbbb" />
        <stop offset="50%" stopColor="#888888" />
        <stop offset="100%" stopColor="#555555" />
      </linearGradient>
    </defs>

    <style>{`
      .ak-trace-bg { stroke: #252525; stroke-width: 1.8; fill: none; }
      .ak-trace-flow {
        stroke-width: 1.8; fill: none;
        stroke-dasharray: 40 400;
        stroke-dashoffset: 438;
        filter: drop-shadow(0 0 6px currentColor);
        animation: akflow 3s cubic-bezier(0.5,0,0.9,1) infinite;
        stroke: #fba12c; color: #e96e14;
      }
      @keyframes akflow { to { stroke-dashoffset: 0; } }
    `}</style>

    <g>
      <path d="M100 100 H200 V210 H326" className="ak-trace-bg" />
      <path d="M100 100 H200 V210 H326" className="ak-trace-flow" />
      <path d="M80 180 H180 V230 H326" className="ak-trace-bg" />
      <path d="M80 180 H180 V230 H326" className="ak-trace-flow" />
      <path d="M60 260 H150 V250 H326" className="ak-trace-bg" />
      <path d="M60 260 H150 V250 H326" className="ak-trace-flow" />
      <path d="M100 350 H200 V270 H326" className="ak-trace-bg" />
      <path d="M100 350 H200 V270 H326" className="ak-trace-flow" />
      <path d="M700 90 H560 V210 H474" className="ak-trace-bg" />
      <path d="M700 90 H560 V210 H474" className="ak-trace-flow" />
      <path d="M740 160 H580 V230 H474" className="ak-trace-bg" />
      <path d="M740 160 H580 V230 H474" className="ak-trace-flow" />
      <path d="M720 250 H590 V250 H474" className="ak-trace-bg" />
      <path d="M720 250 H590 V250 H474" className="ak-trace-flow" />
      <path d="M680 340 H570 V270 H474" className="ak-trace-bg" />
      <path d="M680 340 H570 V270 H474" className="ak-trace-flow" />
    </g>

    <rect
      x="330"
      y="190"
      width="140"
      height="100"
      rx="20"
      ry="20"
      fill="url(#chipGradientAk)"
      stroke="#fba12c"
      strokeOpacity="0.5"
      strokeWidth="2"
      filter="drop-shadow(0 0 12px rgba(251,161,44,0.5))"
    />

    {[205, 225, 245, 265].map((y) => (
      <rect
        key={`l-${y}`}
        x="322"
        y={y}
        width="8"
        height="10"
        fill="url(#pinGradientAk)"
        rx="2"
      />
    ))}
    {[205, 225, 245, 265].map((y) => (
      <rect
        key={`r-${y}`}
        x="470"
        y={y}
        width="8"
        height="10"
        fill="url(#pinGradientAk)"
        rx="2"
      />
    ))}

    <text
      x="400"
      y="246"
      fontFamily="'Bricolage Grotesque', Arial, sans-serif"
      fontSize="22"
      fontWeight="700"
      fill="url(#textGradientAk)"
      textAnchor="middle"
    >
      Astrokitos
    </text>

    {[100, 80, 60, 100].map((cx, i) => (
      <circle key={`lc-${i}`} cx={cx} cy={[100, 180, 260, 350][i]} r="5" fill="#000" stroke="#fba12c" strokeOpacity="0.6" />
    ))}
    {[700, 740, 720, 680].map((cx, i) => (
      <circle key={`rc-${i}`} cx={cx} cy={[90, 160, 250, 340][i]} r="5" fill="#000" stroke="#fba12c" strokeOpacity="0.6" />
    ))}
  </svg>
);

export default IntroFlow;
