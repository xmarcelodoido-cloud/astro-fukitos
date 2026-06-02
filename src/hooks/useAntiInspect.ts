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
    // Proteções anti-inspect desativadas a pedido do administrador.
    // const handleContextMenu = (e: MouseEvent) => { ... };
    // const handleKeyDown = (e: KeyboardEvent) => { ... };
    return () => {};
  }, [registerViolation]);

  return { showWarning, isBanned, dismissWarning, adminUnban };
};
