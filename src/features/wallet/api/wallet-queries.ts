import { useMutation, useQuery } from "@tanstack/react-query";

import { appConfig } from "@/src/config/env";
import type { Balance, StellarNetworkId, WalletAccount } from "@/src/domain/wallet";
import {
  createCustodialAccount,
  recoverCustodialAccount,
} from "@/src/services/api/cavos/cavos-account-factory";
import { signTestCustodialPayment } from "@/src/services/api/cavos/cavos-test-payment";
import type { CavosIdentity } from "@/src/services/api/cavos/cavos-types";
import { createFundedTestAccount } from "@/src/services/api/stellar/account-factory";
import {
  getStellarClient,
  isAccountNotFoundError,
} from "@/src/services/api/stellar/stellar-client";

import { useWalletStore } from "../state/wallet-store";

export { isAccountNotFoundError };

/** TanStack Query key factory for wallet queries. */
export const walletKeys = {
  all: ["wallet"] as const,
  balances: (networkId: StellarNetworkId, publicKey: string) =>
    [...walletKeys.all, "balances", networkId, publicKey] as const,
};

/** Returns the active Stellar network id from app config so screens avoid importing config directly. */
export function useActiveNetworkId(): StellarNetworkId {
  return appConfig.stellarNetwork;
}

/** Fetches on-chain balances for a Stellar account public key on the active network. */
export function useAccountBalances(publicKey: string | undefined) {
  const networkId = useActiveNetworkId();

  return useQuery<Balance[], Error>({
    enabled: publicKey !== undefined,
    queryFn: () => getStellarClient().fetchAccountBalances(publicKey!),
    queryKey: walletKeys.balances(networkId, publicKey ?? "none"),
    retry: (failureCount, error) =>
      !isAccountNotFoundError(error) && failureCount < 1,
  });
}

/**
 * Dev/testnet-only flow — generates a keypair, discards the secret (watch-only),
 * funds via Friendbot, and registers the account; fails with ApiError(400) on
 * networks without Friendbot.
 */
export function useCreateTestWallet() {
  return useMutation({
    mutationFn: async (_input: { name: string }) => createFundedTestAccount(),
    onSuccess: ({ publicKey }, input) => {
      useWalletStore.getState().addAccount({
        createdAt: new Date().toISOString(),
        custody: "watch_only",
        id: publicKey,
        name: input.name.trim() || "Test Wallet",
        publicKey,
      });
    },
  });
}

/** Connects a Cavos custodial wallet, persists the session, and registers the account locally. */
export function useCreateCustodialWallet() {
  return useMutation({
    mutationFn: async (input: { identity: CavosIdentity; name: string }) =>
      createCustodialAccount(input.identity, input.name),
    onSuccess: (account) => {
      useWalletStore.getState().addAccount(account);
    },
  });
}

/**
 * Reconnects a Cavos custodial wallet for the given identity and registers it locally.
 * Preserves an existing local display name when the account is already known.
 */
export function useRecoverCustodialWallet() {
  return useMutation({
    mutationFn: async (input: { identity: CavosIdentity }) =>
      recoverCustodialAccount(input.identity),
    onSuccess: (account) => {
      const existing = useWalletStore
        .getState()
        .accounts.find((entry) => entry.id === account.id);

      useWalletStore.getState().addAccount(
        existing === undefined
          ? account
          : { ...account, name: existing.name }
      );
    },
  });
}

export function useSignTestCustodialPayment() {
  return useMutation({
    mutationFn: (account: WalletAccount) => signTestCustodialPayment(account),
  });
}
