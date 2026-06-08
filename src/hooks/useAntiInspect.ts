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
      registerViolation("contextmenu");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        registerViolation("F12");
        return;
      }
      // Ctrl+Shift+I / J / C / K
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key)) {
        e.preventDefault();
        registerViolation(`Ctrl+Shift+${key.toUpperCase()}`);
        return;
      }
      // Cmd+Opt+I / J / C (Mac)
      if (e.metaKey && e.altKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        registerViolation(`Cmd+Opt+${key.toUpperCase()}`);
        return;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        registerViolation("Ctrl+U");
        return;
      }
      // Ctrl+S (save page)
      if (e.ctrlKey && key === "s") {
        e.preventDefault();
        registerViolation("Ctrl+S");
        return;
      }
      // Ctrl+P (print)
      if (e.ctrlKey && key === "p") {
        e.preventDefault();
        registerViolation("Ctrl+P");
        return;
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))) {
        return;
      }
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))) {
        return;
      }
      e.preventDefault();
      registerViolation("copy");
    };

    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [registerViolation]);

  return { showWarning, isBanned, dismissWarning, adminUnban };
};
