import { create } from "zustand";

import { appConfig } from "@/src/config/env";
import type { WalletAccount } from "@/src/domain/wallet";

import { DEV_SEED_ACCOUNTS } from "./wallet-seed";

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

const initialAccounts =
  appConfig.environment === "development" ? DEV_SEED_ACCOUNTS : [];

const initialActiveAccountId =
  appConfig.environment === "development"
    ? (DEV_SEED_ACCOUNTS[0]?.id ?? null)
    : null;

/**
 * In-memory wallet account state for the foundation epic.
 * Persistence ships with the custody epics (SecureStore stays reserved for secrets per CLAUDE.md).
 */
export const useWalletStore = create<WalletState>((set, get) => ({
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
      const accounts = state.accounts.filter((account) => account.id !== accountId);
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
}));

/** Returns the currently active wallet account, if any. */
export function selectActiveAccount(state: WalletState): WalletAccount | null {
  if (state.activeAccountId === null) {
    return null;
  }

  return state.accounts.find((account) => account.id === state.activeAccountId) ?? null;
}

/** Subscribes to the full wallet account list. */
export function useWalletAccounts(): WalletAccount[] {
  return useWalletStore((state) => state.accounts);
}

/** Subscribes to the currently active wallet account. */
export function useActiveAccount(): WalletAccount | null {
  return useWalletStore((state) => selectActiveAccount(state));
}

/** Subscribes to a single wallet account by id. */
export function useWalletAccount(
  accountId: string | undefined
): WalletAccount | undefined {
  return useWalletStore((state) =>
    accountId === undefined
      ? undefined
      : state.accounts.find((account) => account.id === accountId)
  );
}
