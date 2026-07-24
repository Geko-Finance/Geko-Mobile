import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Contact } from "@/src/domain/contacts";
import { asyncStateStorage } from "@/src/services/storage/async-json-storage";

interface ContactsState {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  upsertContact: (contact: Contact) => void;
  removeContact: (contactId: string) => void;
  toggleFavorite: (contactId: string) => void;
}

/**
 * Saved-contact state for the address-book epic. Contacts are non-sensitive app data (never
 * secrets), so this persists via AsyncStorage like `wallet-store`, not SecureStore.
 */
export const useContactsStore = create<ContactsState>()(
  persist(
    (set) => ({
      contacts: [],
      removeContact: (contactId) =>
        set((state) => ({
          contacts: state.contacts.filter((entry) => entry.id !== contactId),
        })),
      setContacts: (contacts) => set({ contacts }),
      toggleFavorite: (contactId) =>
        set((state) => ({
          contacts: state.contacts.map((entry) =>
            entry.id === contactId ? { ...entry, favorite: !entry.favorite } : entry
          ),
        })),
      upsertContact: (contact) =>
        set((state) => {
          const existingIndex = state.contacts.findIndex(
            (entry) => entry.id === contact.id
          );
          const contacts =
            existingIndex >= 0
              ? state.contacts.map((entry, index) =>
                  index === existingIndex ? contact : entry
                )
              : [...state.contacts, contact];

          return { contacts };
        }),
    }),
    {
      name: "geko.contacts.v1",
      storage: createJSONStorage(() => asyncStateStorage),
      version: 1,
    }
  )
);

/** Subscribes to the full contact list. */
export function useContacts(): Contact[] {
  return useContactsStore((state) => state.contacts);
}

/** Subscribes to a single contact by id (id === address). */
export function useContact(contactId: string | undefined): Contact | undefined {
  return useContactsStore((state) =>
    contactId === undefined
      ? undefined
      : state.contacts.find((entry) => entry.id === contactId)
  );
}
