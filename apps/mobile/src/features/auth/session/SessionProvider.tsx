import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { logout } from "@/src/features/auth/api/auth-client";
import { isBiometricLockEnabled } from "@/src/features/auth/session/biometric-lock-preference";
import { registerPushToken } from "@/src/features/notifications/register-push-token";
import { queryClient } from "@/src/services/api/query-client";
import { deviceBiometricAuthorizer } from "@/src/services/wallet/biometric-authorizer";

import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "./session-storage";
import { useSessionStore } from "./session-store";
import type { Session, SessionStatus } from "./session-types";

interface SessionContextValue {
  session: Session | null;
  status: SessionStatus;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<void>;
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const storedSession = await getStoredSession();

      if (!isMounted) {
        return;
      }

      if (!storedSession) {
        setSession(null);
        setStatus("anonymous");
        return;
      }

      setSession(storedSession);

      const hasTokens = Boolean(storedSession.tokens);
      const lockEnabled = hasTokens && (await isBiometricLockEnabled());

      if (!isMounted) {
        return;
      }

      setStatus(lockEnabled ? "locked" : "authenticated");
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

  // Re-lock when returning from background (not inactive — Face ID uses inactive).
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const previous = appStateRef.current;
        appStateRef.current = nextState;

        if (previous !== "background" || nextState !== "active") {
          return;
        }

        const { session: currentSession, status: currentStatus } =
          useSessionStore.getState();

        if (
          currentStatus !== "authenticated" ||
          !currentSession?.tokens
        ) {
          return;
        }

        void isBiometricLockEnabled().then((enabled) => {
          if (!enabled) {
            return;
          }

          const still = useSessionStore.getState();
          if (
            still.status === "authenticated" &&
            still.session?.tokens
          ) {
            setStatus("locked");
          }
        });
      }
    );

    return () => {
      subscription.remove();
    };
  }, [setStatus]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    void registerPushToken();
  }, [status]);

  const signIn = useCallback(
    async (nextSession: Session) => {
      await setStoredSession(nextSession);
      setSession(nextSession);
      // Fresh login/signup skips the lock gate.
      setStatus("authenticated");
    },
    [setSession, setStatus]
  );

  const signOut = useCallback(async () => {
    const current = useSessionStore.getState().session;
    const tokens = current?.tokens;

    if (tokens) {
      try {
        await logout(tokens.accessToken, tokens.refreshToken);
      } catch {
        // Best-effort server logout — always clear local state.
      }
    }

    await clearStoredSession();
    queryClient.clear();
    setSession(null);
    setStatus("anonymous");
  }, [setSession, setStatus]);

  const unlock = useCallback(async () => {
    if (useSessionStore.getState().status !== "locked") {
      return;
    }

    await deviceBiometricAuthorizer.authorize("Unlock Geko");
    setStatus("authenticated");
  }, [setStatus]);

  const value = useMemo(
    () => ({
      session,
      status,
      signIn,
      signOut,
      unlock,
    }),
    [session, signIn, signOut, status, unlock]
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
