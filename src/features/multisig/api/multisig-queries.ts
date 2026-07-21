import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { evaluatePendingTx } from "@/src/domain/multisig";
import type { MultisigAccountConfig, PendingTx } from "@/src/domain/multisig";
import type { WalletAccount } from "@/src/domain/wallet";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { getStellarClient } from "@/src/services/api/stellar/stellar-client";
import {
  buildProposedPaymentTransaction,
  buildSignerConfigTransaction,
  submitSignedTransaction,
} from "@/src/services/api/stellar/multisig-transactions";
import type {
  SignerChange,
  ThresholdChange,
} from "@/src/services/api/stellar/multisig-transactions";
import { getWalletSigner } from "@/src/services/wallet/signer-factory";

import { usePendingTxStore } from "../state/pending-tx-store";

export { usePendingTxsForAccount } from "../state/pending-tx-store";

/**
 * `pending-tx-store.ts` exposes `upsertPendingTx`/`removePendingTx` as actions on
 * `usePendingTxStore` rather than as standalone named exports, so they're read off
 * `getState()` here instead of imported directly.
 */
const { upsertPendingTx, removePendingTx } = usePendingTxStore.getState();

/** TanStack Query key factory for multisig queries. */
export const multisigKeys = {
  all: ["multisig"] as const,
  config: (publicKey: string) => [...multisigKeys.all, "config", publicKey] as const,
};

/** Fetches an account's on-chain signer/threshold configuration. */
export function useMultisigConfig(publicKey: string | undefined) {
  return useQuery<MultisigAccountConfig, Error>({
    enabled: publicKey !== undefined,
    queryFn: () => getStellarClient().fetchAccountMultisigConfig(publicKey!),
    queryKey: multisigKeys.config(publicKey ?? "none"),
  });
}

/** Builds, signs, and submits a signer/threshold configuration change. Single-signer flow only — assumes the acting account's own signature alone meets the (already-high) threshold this operation requires, which callers must confirm via `wouldRiskPermanentLockout` before calling. */
export function useUpdateSignerConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      signerChanges: SignerChange[];
      thresholdChange?: ThresholdChange;
      lockMasterKey?: boolean;
    }) => {
      const networkConfig = getActiveStellarNetwork();
      const unsignedXdr = await buildSignerConfigTransaction(input);
      const signer = getWalletSigner(input.account);
      const signedXdr = await signer.signTransaction(unsignedXdr, {
        networkPassphrase: networkConfig.networkPassphrase,
      });

      await submitSignedTransaction(signedXdr, networkConfig.networkPassphrase);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: multisigKeys.config(input.account.publicKey),
      });
    },
  });
}

/**
 * Proposes a payment. If the proposer's own signature alone already satisfies the account's
 * threshold for a payment (the common case for a non-multisig or low-threshold account), submits
 * immediately. Otherwise saves it to the pending-tx store for co-signer collection and returns
 * the signed envelope directly — callers must NOT try to re-derive it by reading the pending-tx
 * store right after this resolves (Zustand's reactive subscription won't reflect the just-made
 * update inside a value captured by the same render/closure that triggered the mutation).
 */
export function useProposePayment() {
  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      destination: string;
      assetCode?: string;
      assetIssuer?: string;
      amount: string;
      config: MultisigAccountConfig;
    }): Promise<
      | { submitted: true }
      | { submitted: false; envelopeXdr: string; networkPassphrase: string }
    > => {
      const { xdr, networkPassphrase } = await buildProposedPaymentTransaction(input);
      const signer = getWalletSigner(input.account);
      const signedXdr = await signer.signTransaction(xdr, { networkPassphrase });

      const evaluation = evaluatePendingTx(signedXdr, networkPassphrase, input.config);

      if (evaluation.isSatisfied) {
        await submitSignedTransaction(signedXdr, networkPassphrase);
        return { submitted: true };
      }

      upsertPendingTx(input.account.id, signedXdr, networkPassphrase);
      return { submitted: false, envelopeXdr: signedXdr, networkPassphrase };
    },
  });
}

/** Signs a locally-known pending transaction with the given account's WalletSigner, merging the new signature in. */
export function useSignPendingTx() {
  return useMutation({
    mutationFn: async (input: { pendingTx: PendingTx; account: WalletAccount }) => {
      const signer = getWalletSigner(input.account);
      const signedXdr = await signer.signTransaction(input.pendingTx.envelopeXdr, {
        networkPassphrase: input.pendingTx.networkPassphrase,
      });

      upsertPendingTx(
        input.pendingTx.sourceAccountId,
        signedXdr,
        input.pendingTx.networkPassphrase,
        input.pendingTx.description
      );
    },
  });
}

/** Submits a pending transaction to Horizon and removes it from the local store on success. */
export function useSubmitPendingTx() {
  return useMutation({
    mutationFn: async (pendingTx: PendingTx) => {
      await submitSignedTransaction(pendingTx.envelopeXdr, pendingTx.networkPassphrase);
    },
    onSuccess: (_data, pendingTx) => {
      removePendingTx(pendingTx.id);
    },
  });
}
