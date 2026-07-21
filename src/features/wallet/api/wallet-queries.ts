import { useMutation, useQuery } from "@tanstack/react-query";

import { appConfig } from "@/src/config/env";
import type { Balance, StellarNetworkId } from "@/src/domain/wallet";
import {
  createFundedTestAccount,
  createNonCustodialAccount,
} from "@/src/services/api/stellar/account-factory";
import {
  getStellarClient,
  isAccountNotFoundError,
} from "@/src/services/api/stellar/stellar-client";
import { persistSigningSecret } from "@/src/services/wallet/local-signer";

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

/**
 * Generates a real non-custodial keypair, persists its secret in SecureStore, and registers the
 * account as `custody: "non_custodial"`. Works on both testnet and mainnet (no Friendbot call);
 * the account must be funded separately before it can transact.
 */
export function useCreateNonCustodialWallet() {
  return useMutation({
    mutationFn: async (_input: { name: string }) => createNonCustodialAccount(),
    onSuccess: async ({ publicKey, secretKey }, input) => {
      await persistSigningSecret(publicKey, secretKey);
      useWalletStore.getState().addAccount({
        createdAt: new Date().toISOString(),
        custody: "non_custodial",
        id: publicKey,
        name: input.name.trim() || "Self-custody wallet",
        publicKey,
      });
    },
  });
}
