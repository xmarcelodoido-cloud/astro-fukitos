import { useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";

const BAN_KEY = "astrokitos_banned";
const ATTEMPTS_KEY = "astrokitos_devtools_attempts";
const MAX_ATTEMPTS = 5;
const SIZE_THRESHOLD = 160;
const BLUR_CLASS = "astrokitos-devtools-blur";

/**
 * Shield global de segurança:
 * - Detecta DevTools por delta de viewport e por trap `debugger`.
 * - Conta tentativas; após MAX_ATTEMPTS, aplica banimento permanente.
 * - Bloqueia a página com overlay quando DevTools está aberto.
 */
export const SecurityShield = ({ children }: { children: ReactNode }) => {
  const [blocked, setBlocked] = useState(false);
  const [banned, setBanned] = useState(() => {
    try {
      return localStorage.getItem(BAN_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (banned) return;
    // Inject CSS once: blur + scramble content when DevTools is detected.
    const styleId = "astrokitos-devtools-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        html.${BLUR_CLASS} body { filter: blur(14px) saturate(0.3) !important; pointer-events: none !important; user-select: none !important; }
        html.${BLUR_CLASS} body * { text-shadow: 0 0 12px currentColor !important; }
      `;
      document.head.appendChild(style);
    }


    let devtoolsOpen = false;
    let attempts = 0;
    try {
      attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10) || 0;
    } catch { /* ignore */ }

    const registerAttempt = () => {
      attempts += 1;
      try {
        localStorage.setItem(ATTEMPTS_KEY, String(attempts));
      } catch { /* ignore */ }
      logger.logInspectAttempt(undefined, undefined, `devtools_open_${attempts}`);

      if (attempts >= MAX_ATTEMPTS) {
        try {
          localStorage.setItem(BAN_KEY, "true");
        } catch { /* ignore */ }
        setBanned(true);
      }
    };

    const check = () => {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const isOpen = widthDelta > SIZE_THRESHOLD || heightDelta > SIZE_THRESHOLD;

      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        setBlocked(true);
        document.documentElement.classList.add(BLUR_CLASS);
        registerAttempt();
      } else if (!isOpen && devtoolsOpen) {
        devtoolsOpen = false;
        setBlocked(false);
        document.documentElement.classList.remove(BLUR_CLASS);
      }
    };

    // Trap via debugger: bloco com `debugger` trava se DevTools estiver aberto.
    const debuggerTrap = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          setBlocked(true);
          document.documentElement.classList.add(BLUR_CLASS);
          registerAttempt();
        }
      }
    };

    check();
    const interval = window.setInterval(() => {
      check();
      debuggerTrap();
    }, 1500);
    window.addEventListener("resize", check);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", check);
      document.documentElement.classList.remove(BLUR_CLASS);
    };
  }, [banned]);

  if (banned) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-red-500">🚫 Acesso permanentemente bloqueado</h1>
          <p className="text-white/80">
            Detectamos uso excessivo de ferramentas de inspeção neste dispositivo.
            O acesso ao Astrokitos foi bloqueado de forma permanente.
          </p>
          <p className="text-sm text-white/50">
            Se você acredita que isso é um engano, entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-[#fba12c]">⚠️ Sistema Galáctico</h1>
          <p className="text-white/80">
            Ferramentas de desenvolvedor detectadas. Feche o DevTools para continuar usando o Astrokitos.
          </p>
          <p className="text-sm text-white/50">
            Tentativas restantes antes do banimento permanente: aproximadamente {Math.max(0, MAX_ATTEMPTS - (parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10) || 0))}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SecurityShield;
