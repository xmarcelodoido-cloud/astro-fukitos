import { useEffect } from "react";

export const useAntiInspect = () => {
  useEffect(() => {
    // Bloquear botão direito
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Bloquear atalhos de teclado (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
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
