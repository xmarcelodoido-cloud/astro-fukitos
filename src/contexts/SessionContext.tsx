import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setSessionData } from "@/lib/api";

export interface RaSession {
  ra: string;
  nick: string;
  auth_token: string;
  roomCode: string;
  targets: string[];
}

interface SessionContextValue {
  session: RaSession | null;
  setSession: (s: RaSession | null) => void;
  logout: () => void;
}

const KEY = "astrokitos_session";
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<RaSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as RaSession;
      setSessionData({ token: s.auth_token, nick: s.nick, roomCode: s.roomCode, targets: s.targets });
      return s;
    } catch {
      return null;
    }
  });

  const setSession = (s: RaSession | null) => {
    setSessionState(s);
    try {
      if (s) {
        sessionStorage.setItem(KEY, JSON.stringify(s));
        setSessionData({ token: s.auth_token, nick: s.nick, roomCode: s.roomCode, targets: s.targets });
      } else {
        sessionStorage.removeItem(KEY);
        setSessionData(null);
      }
    } catch { /* ignore */ }
  };

  const logout = () => setSession(null);

  useEffect(() => {
    // keep api.ts sessionData in sync on mount
    if (session) setSessionData({ token: session.auth_token, nick: session.nick, roomCode: session.roomCode, targets: session.targets });
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
