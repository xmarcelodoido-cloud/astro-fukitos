import { useEffect, useState } from "react";

/**
 * Detecta abertura do DevTools por diferença threshold (window outer vs inner).
 * Quando detectado, oculta TODO o app e mostra um aviso galáctico.
 */
export const SecurityShield = ({ children }: { children: React.ReactNode }) => {
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    const threshold = 160;

    const check = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      setDevtoolsOpen(open);
    };

    check();
    const id = setInterval(check, 800);
    window.addEventListener("resize", check);

    // debugger trap
    const trap = setInterval(() => {
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const t1 = performance.now();
      if (t1 - t0 > 100) setDevtoolsOpen(true);
    }, 2000);

    return () => {
      clearInterval(id);
      clearInterval(trap);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (devtoolsOpen) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="text-5xl mb-4">🛰️</div>
          <h1 className="text-xl md:text-2xl font-bold text-gradient mb-3 font-bricolage">
            Sistema Galáctico
          </h1>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Sistema galáctico identificou que o usuário está utilizando o
            <span className="text-primary font-semibold"> modo de desenvolvedor</span>.
            Sistema desativado — saia do modo desenvolvedor para poder reutilizar o
            nosso sistema.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SecurityShield;
