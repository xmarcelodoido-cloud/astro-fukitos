import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

const MAX_VIOLATIONS = 5;
const BAN_THRESHOLD = 10;
const BAN_KEY = "astrokitos_banned";

interface UseAntiInspectOptions {
  ra?: string;
  studentName?: string;
}

export const useAntiInspect = (options: UseAntiInspectOptions = {}) => {
  const optionsRef = useRef(options);
  const violationCount = useRef(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isBanned, setIsBanned] = useState(() => {
    try {
      return localStorage.getItem(BAN_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const registerViolation = useCallback((method: string) => {
    logger.logInspectAttempt(
      optionsRef.current.ra,
      optionsRef.current.studentName,
      method
    );

    violationCount.current += 1;
    const count = violationCount.current;

    if (count < MAX_VIOLATIONS) {
      // Early violations - just log
    } else if (count === MAX_VIOLATIONS) {
      setShowWarning(true);
    } else if (count >= BAN_THRESHOLD) {
      try {
        localStorage.setItem(BAN_KEY, "true");
      } catch { /* ignore */ }
      setIsBanned(true);
      setShowWarning(false);
    }
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  const adminUnban = useCallback(() => {
    try {
      localStorage.removeItem(BAN_KEY);
    } catch { /* ignore */ }
    setIsBanned(false);
    setShowWarning(false);
    violationCount.current = 0;
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      registerViolation("context_menu");
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        registerViolation("F12");
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        registerViolation("Ctrl+Shift+I");
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        registerViolation("Ctrl+Shift+J");
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        registerViolation("Ctrl+Shift+C");
        return false;
      }
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        registerViolation("Ctrl+U");
        return false;
      }
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        registerViolation("Ctrl+S");
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [registerViolation]);

  return { showWarning, isBanned, dismissWarning, adminUnban };
};
