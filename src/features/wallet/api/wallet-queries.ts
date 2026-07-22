import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { appConfig } from "@/src/config/env";
import type { Balance, StellarNetworkId, WalletAccount } from "@/src/domain/wallet";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { connectCustodialAccount } from "@/src/services/api/cavos/cavos-account-factory";
import { signTestCustodialPayment } from "@/src/services/api/cavos/cavos-test-payment";
import type { CavosIdentity } from "@/src/services/api/cavos/cavos-types";
import { createFundedTestAccount } from "@/src/services/api/stellar/account-factory";
import { fundTestnetAccount } from "@/src/services/api/stellar/friendbot";
import {
  fetchAccountPayments,
  type StellarTransactionEntry,
} from "@/src/services/api/stellar/stellar-history";
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
  transactions: (networkId: StellarNetworkId, publicKey: string) =>
    [...walletKeys.all, "transactions", networkId, publicKey] as const,
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

/** Fetches recent Stellar payment history for an account public key on the active network. */
export function useAccountTransactions(publicKey: string | undefined) {
  const networkId = useActiveNetworkId();

  return useQuery<StellarTransactionEntry[], Error>({
    enabled: publicKey !== undefined,
    queryFn: () => fetchAccountPayments(publicKey!, networkId),
    queryKey: walletKeys.transactions(networkId, publicKey ?? "none"),
  });
}

/**
 * Dev/testnet-only flow - generates a keypair, discards the secret (watch-only),
 * funds via Friendbot, and registers the account; fails with ApiError(400) on
 * networks without Friendbot.
 */
export function useCreateTestWallet() {
  const { session } = useSession();

  return useMutation({
    mutationFn: async (_input: { name: string }) => createFundedTestAccount(),
    onSuccess: ({ publicKey }, input) => {
      if (session === null) {
        return;
      }

      useWalletStore.getState().addAccount({
        createdAt: new Date().toISOString(),
        custody: "watch_only",
        id: publicKey,
        name: input.name.trim() || "Test Wallet",
        ownerUserId: session.user.id,
        publicKey,
      });
    },
  });
}

export function useFundTestnetAccount() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (publicKey: string) => fundTestnetAccount(publicKey),
    onSuccess: (_data, publicKey) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, publicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(networkId, publicKey),
      });
    },
  });
}

/**
 * Connects a Cavos custodial wallet for the given identity and registers it locally -
 * covers both first-time creation and reconnecting on a later device (connect is
 * deterministic per identity, see cavos-account-factory.ts). Preserves an existing
 * local display name when the account is already known.
 */
export function useConnectCustodialWallet() {
  return useMutation({
    mutationFn: async (input: { identity: CavosIdentity; name?: string }) =>
      connectCustodialAccount(input.identity, input.name),
    onSuccess: ({ account }) => {
      const existing = useWalletStore
        .getState()
        .accounts.find((entry) => entry.id === account.id);

      useWalletStore.getState().addAccount(
        existing === undefined
          ? account
          : { ...account, name: existing.name }
      );
    },
    onError: (error) => {
      console.error("Custodial wallet connect failed:", error);
    },
  });
}

export function useSignTestCustodialPayment() {
  return useMutation({
    mutationFn: (account: WalletAccount) => signTestCustodialPayment(account),
  });
}
