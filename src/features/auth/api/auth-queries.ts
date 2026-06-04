import { useMutation, useQuery } from "@tanstack/react-query";

import { getMe, login } from "./auth-api";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
};

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  });
}

export function useMeQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getMe,
    queryKey: authQueryKeys.me,
  });
}
