import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";

interface UseAntiInspectOptions {
  ra?: string;
  studentName?: string;
}

export const useAntiInspect = (options: UseAntiInspectOptions = {}) => {
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const logAttempt = (method: string) => {
      logger.logInspectAttempt(
        optionsRef.current.ra,
        optionsRef.current.studentName,
        method
      );
    };

    // Bloquear botão direito
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logAttempt("context_menu");
      return false;
    };

    // Bloquear atalhos de teclado (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        logAttempt("F12");
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        logAttempt("Ctrl+Shift+I");
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        logAttempt("Ctrl+Shift+J");
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        logAttempt("Ctrl+Shift+C");
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        logAttempt("Ctrl+U");
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        logAttempt("Ctrl+S");
        return false;
      }
    };

    // Adicionar listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
};
