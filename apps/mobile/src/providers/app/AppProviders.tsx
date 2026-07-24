import { QueryClientProvider } from "@tanstack/react-query";

import { SessionProvider } from "@/src/features/auth/session/SessionProvider";
import { queryClient } from "@/src/services/api/query-client";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
