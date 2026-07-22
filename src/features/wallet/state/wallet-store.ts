import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { WalletAccount } from "@/src/domain/wallet";
import { useSessionStore } from "@/src/features/auth/session/session-store";
import { asyncStateStorage } from "@/src/services/storage/async-json-storage";

interface WalletState {
  accounts: WalletAccount[];
  activeAccountId: string | null;
  setAccounts: (accounts: WalletAccount[]) => void;
  addAccount: (account: WalletAccount) => void;
  removeAccount: (accountId: string) => void;
  setActiveAccount: (accountId: string) => void;
  renameAccount: (accountId: string, name: string) => void;
}

const resolveActiveAccountId = (
  accounts: WalletAccount[],
  preferredId: string | null
): string | null => {
  if (preferredId !== null && accounts.some((account) => account.id === preferredId)) {
    return preferredId;
  }

  return accounts[0]?.id ?? null;
};

const initialAccounts: WalletAccount[] = [];

const initialActiveAccountId = null;

/**
 * Wallet account metadata state for the foundation epic.
 * Persists account metadata (names, public keys, custody kind - never secrets) via AsyncStorage;
 * SecureStore stays reserved for secrets per CLAUDE.md.
 */
export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      accounts: initialAccounts,
      activeAccountId: initialActiveAccountId,
      setAccounts: (accounts) =>
        set((state) => ({
          accounts,
          activeAccountId: resolveActiveAccountId(accounts, state.activeAccountId),
        })),
      addAccount: (account) =>
        set((state) => {
          const existingIndex = state.accounts.findIndex(
            (entry) => entry.id === account.id
          );
          const accounts =
            existingIndex >= 0
              ? state.accounts.map((entry, index) =>
                  index === existingIndex ? account : entry
                )
              : [...state.accounts, account];
          const activeAccountId =
            state.activeAccountId === null ? account.id : state.activeAccountId;

          return { accounts, activeAccountId };
        }),
      removeAccount: (accountId) =>
        set((state) => {
          const accounts = state.accounts.filter(
            (account) => account.id !== accountId
          );
          const activeAccountId =
            state.activeAccountId === accountId
              ? resolveActiveAccountId(accounts, null)
              : state.activeAccountId;

          return { accounts, activeAccountId };
        }),
      setActiveAccount: (accountId) => {
        if (!get().accounts.some((account) => account.id === accountId)) {
          return;
        }

        set({ activeAccountId: accountId });
      },
      renameAccount: (accountId, name) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id === accountId ? { ...account, name } : account
          ),
        })),
    }),
    {
      name: "geko.wallet.accounts.v1",
      partialize: (state) => ({
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
      }),
      storage: createJSONStorage(() => asyncStateStorage),
      version: 1,
    }
  )
);

/**
 * Subscribes to the wallet account list, filtered to the signed-in session's own accounts.
 * wallet-store persists across sign-outs (it's account metadata, not a secret), so every
 * read path must filter by owner - otherwise one profile would see another profile's
 * locally-cached accounts on the same device.
 */
export function useWalletAccounts(): WalletAccount[] {
  const ownerUserId = useSessionStore((state) => state.session?.user.id);
  const accounts = useWalletStore((state) => state.accounts);

  // `.filter()` returns a new array every call - memoize it, since a zustand
  // selector that returns a fresh reference each render breaks the store's
  // getSnapshot equality check and causes an infinite render loop.
  return useMemo(
    () =>
      ownerUserId === undefined
        ? []
        : accounts.filter((account) => account.ownerUserId === ownerUserId),
    [accounts, ownerUserId]
  );
}

/** Subscribes to the currently active wallet account, scoped to the signed-in session. */
export function useActiveAccount(): WalletAccount | null {
  const accounts = useWalletAccounts();
  const activeAccountId = useWalletStore((state) => state.activeAccountId);

  if (activeAccountId !== null) {
    const active = accounts.find((account) => account.id === activeAccountId);

    if (active !== undefined) {
      return active;
    }
  }

  return accounts[0] ?? null;
}

/** Subscribes to a single wallet account by id, scoped to the signed-in session. */
export function useWalletAccount(
  accountId: string | undefined
): WalletAccount | undefined {
  const accounts = useWalletAccounts();

  return accountId === undefined
    ? undefined
    : accounts.find((account) => account.id === accountId);
}
