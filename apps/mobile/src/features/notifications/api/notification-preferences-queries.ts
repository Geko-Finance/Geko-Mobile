import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { apiRequest } from "@/src/services/api/api-client";

export interface NotificationPreferences {
  securityAlerts: boolean;
  transactions: boolean;
  priceAlerts: boolean;
  marketing: boolean;
  productUpdates: boolean;
}

export type UpdateNotificationPreferencesInput = Partial<
  Pick<
    NotificationPreferences,
    "transactions" | "priceAlerts" | "marketing" | "productUpdates"
  >
>;

/** TanStack Query key factory for notification preference queries. */
export const notificationPreferencesKeys = {
  all: ["notification-preferences"] as const,
  detail: () => [...notificationPreferencesKeys.all, "detail"] as const,
};

/** Fetches the authenticated user's notification preferences from the backend. */
export function useNotificationPreferences() {
  const { session } = useSession();

  return useQuery<NotificationPreferences, Error>({
    enabled: session !== null,
    queryFn: () =>
      apiRequest<NotificationPreferences>("/notification-preferences", {
        requiresAuth: true,
      }),
    queryKey: notificationPreferencesKeys.detail(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      apiRequest<NotificationPreferences, UpdateNotificationPreferencesInput>(
        "/notification-preferences",
        {
          body: input,
          method: "PATCH",
          requiresAuth: true,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.detail(),
      });
    },
  });
}
