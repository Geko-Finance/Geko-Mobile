import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Contact, MakeContactInput } from "@/src/domain/contacts";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { apiRequest } from "@/src/services/api/api-client";

interface BackendContact {
  id: string;
  userId: string;
  label: string;
  address: string;
  network: Contact["network"];
  memo: string | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

function toContact(record: BackendContact): Contact {
  return {
    address: record.address,
    createdAt: record.createdAt,
    favorite: record.favorite,
    id: record.id,
    label: record.label,
    memo: record.memo ?? undefined,
    network: record.network,
  };
}

/** TanStack Query key factory for contacts queries. */
export const contactKeys = {
  all: ["contacts"] as const,
  list: () => [...contactKeys.all, "list"] as const,
};

/** Fetches the authenticated user's saved contacts from the backend. */
export function useContacts(): Contact[] {
  const { session } = useSession();

  const { data } = useQuery<Contact[], Error>({
    enabled: session !== null,
    queryFn: async () => {
      const records = await apiRequest<BackendContact[]>("/contacts", {
        requiresAuth: true,
      });

      return records.map(toContact);
    },
    queryKey: contactKeys.list(),
  });

  return data ?? [];
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MakeContactInput) => {
      const record = await apiRequest<BackendContact, MakeContactInput>(
        "/contacts",
        {
          body: input,
          method: "POST",
          requiresAuth: true,
        }
      );

      return toContact(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.list() });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      label?: string;
      address?: string;
      memo?: string;
    }) => {
      const { id, ...body } = input;
      const record = await apiRequest<
        BackendContact,
        Pick<typeof input, "label" | "address" | "memo">
      >(`/contacts/${id}`, {
        body,
        method: "PATCH",
        requiresAuth: true,
      });

      return toContact(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.list() });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest<void>(`/contacts/${contactId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.list() });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const record = await apiRequest<BackendContact>(
        `/contacts/${contactId}/favorite`,
        {
          method: "POST",
          requiresAuth: true,
        }
      );

      return toContact(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.list() });
    },
  });
}
