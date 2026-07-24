import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PendingProposal } from "@/src/domain/multisig";
import { canSend, type WalletAccount } from "@/src/domain/wallet";
import {
  useActiveNetworkId,
  walletKeys,
} from "@/src/features/wallet/api/wallet-queries";
import { proposeOperation } from "@/src/features/multisig/api/propose-flow";
import { getCavosClient } from "@/src/services/api/cavos/cavos-client";
import { CavosSigner } from "@/src/services/api/cavos/cavos-signer";
import { submitSignedTransaction } from "@/src/services/api/stellar/horizon-submit";
import { buildNativePaymentXdr } from "@/src/services/api/stellar/payment-xdr";
import { getStellarClient } from "@/src/services/api/stellar/stellar-client";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { fetchAccountSequence } from "@/src/services/api/stellar/stellar-sequence";
import { buildChangeTrustXdr } from "@/src/services/api/stellar/trustline-xdr";
import {
  LocalSigner,
  type WalletPinProvider,
} from "@/src/services/wallet/local-signer";

export function useSendPayment() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      destinationPublicKey: string;
      amountXlm: string;
      asset?: { code: string; issuer: string };
      memo?: string;
      pinProvider?: WalletPinProvider;
    }): Promise<{ hash?: string; proposal?: PendingProposal }> => {
      if (!canSend(input.account)) {
        throw new Error("This account cannot send payments");
      }

      const { networkPassphrase } = getActiveStellarNetwork();
      const sequence = await fetchAccountSequence(input.account.publicKey);
      const unsignedXdr = buildNativePaymentXdr({
        sourcePublicKey: input.account.publicKey,
        sourceSequence: sequence,
        destinationPublicKey: input.destinationPublicKey,
        amountXlm: input.amountXlm,
        networkPassphrase,
        asset: input.asset,
        memo: input.memo,
      });

      if (input.account.custody === "non_custodial") {
        if (input.pinProvider === undefined) {
          throw new Error("Wallet PIN is required to sign this payment");
        }

        // Every non-custodial payment looks up the account's current signers/thresholds
        // first - a real Horizon round-trip, unavoidable since we can't know whether this
        // payment can execute alone or needs co-signers without it. For a regular (never
        // multisig-enabled) account, its default thresholds are met by the master key's own
        // signature alone, so proposeOperation submits immediately here exactly as before.
        const multisigAccount = await getStellarClient().fetchMultisigAccount(
          input.account.publicKey,
        );
        const outcome = await proposeOperation({
          account: multisigAccount,
          operationKind: "payment",
          unsignedXdr,
          networkPassphrase,
          ownerUserId: input.account.ownerUserId,
          pinProvider: input.pinProvider,
        });

        return outcome.status === "submitted"
          ? { hash: outcome.hash }
          : { proposal: outcome.proposal };
      }

      if (input.asset === undefined) {
        const signer = new CavosSigner(
          input.account.id,
          input.account.publicKey,
        );
        const result = await signer.signTransaction(unsignedXdr, {
          networkPassphrase,
        });

        return { hash: result.hash };
      }

      const { signedXdr } = await getCavosClient().signXdr(
        input.account.id,
        unsignedXdr,
      );
      const { hash } = await submitSignedTransaction(signedXdr);

      return { hash };
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.account.publicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(networkId, input.account.publicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.destinationPublicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(networkId, input.destinationPublicKey),
      });
    },
  });
}

export function useAddTrustline() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      code: string;
      issuer: string;
      pinProvider?: WalletPinProvider;
    }): Promise<{ hash: string }> => {
      if (input.account.custody === "non_custodial") {
        if (input.pinProvider === undefined) {
          throw new Error("Wallet PIN is required to add a trustline");
        }

        const { networkPassphrase } = getActiveStellarNetwork();
        const sequence = await fetchAccountSequence(input.account.publicKey);
        const unsignedXdr = buildChangeTrustXdr({
          sourcePublicKey: input.account.publicKey,
          sourceSequence: sequence,
          code: input.code,
          issuer: input.issuer,
          networkPassphrase,
        });
        const signer = new LocalSigner({
          pinProvider: input.pinProvider,
          publicKey: input.account.publicKey,
        });
        const { xdr: signedXdr } = await signer.signTransaction(unsignedXdr, {
          networkPassphrase,
        });

        return submitSignedTransaction(signedXdr);
      }

      return getCavosClient().addTrustline(
        input.account.id,
        input.code,
        input.issuer,
      );
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.account.publicKey),
      });
    },
  });
}
