import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { SessionProvider } from "@/src/features/auth/session/SessionProvider";
import { queryClient } from "@/src/services/api/query-client";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * React Native has no window focus events, so TanStack Query never learns the app went
 * to the background or came back. Feeding AppState into its focusManager pauses polling
 * in the background and refetches stale queries (balances included) on return.
 */
function useAppStateFocus() {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        focusManager.setFocused(status === "active");
      }
    );

    return () => subscription.remove();
  }, []);
}

export function AppProviders({ children }: AppProvidersProps) {
  useAppStateFocus();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
