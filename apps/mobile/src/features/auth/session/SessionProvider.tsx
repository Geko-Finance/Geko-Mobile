import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "./session-storage";
import { useSessionStore } from "./session-store";
import type { Session, SessionStatus } from "./session-types";
import { queryClient } from "@/src/services/api/query-client";

interface SessionContextValue {
  session: Session | null;
  status: SessionStatus;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const session = useSessionStore((state) => state.session);
  const status = useSessionStore((state) => state.status);
  const setSession = useSessionStore((state) => state.setSession);
  const setStatus = useSessionStore((state) => state.setStatus);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const storedSession = await getStoredSession();

      if (!isMounted) {
        return;
      }

      setSession(storedSession);
      setStatus(storedSession ? "authenticated" : "anonymous");
    };

    bootstrapSession().catch(() => {
      if (isMounted) {
        setSession(null);
        setStatus("anonymous");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [setSession, setStatus]);

  const signIn = useCallback(async (nextSession: Session) => {
    await setStoredSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
  }, [setSession, setStatus]);

  const signOut = useCallback(async () => {
    await clearStoredSession();
    queryClient.clear();
    setSession(null);
    setStatus("anonymous");
  }, [setSession, setStatus]);

  const value = useMemo(
    () => ({
      session,
      status,
      signIn,
      signOut,
    }),
    [session, signIn, signOut, status]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return value;
}
