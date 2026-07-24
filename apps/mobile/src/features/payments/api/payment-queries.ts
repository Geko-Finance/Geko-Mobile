import { useMutation, useQueryClient } from "@tanstack/react-query";

import { canSend, type WalletAccount } from "@/src/domain/wallet";
import {
  useActiveNetworkId,
  walletKeys,
} from "@/src/features/wallet/api/wallet-queries";
import { CavosSessionExpiredError } from "@/src/services/api/cavos/cavos-errors";
import { getCavosClient } from "@/src/services/api/cavos/cavos-client";
import { getStoredCavosSession } from "@/src/services/api/cavos/cavos-session-storage";
import { CavosSigner } from "@/src/services/api/cavos/cavos-signer";
import { submitSignedTransaction } from "@/src/services/api/stellar/horizon-submit";
import { buildNativePaymentXdr } from "@/src/services/api/stellar/payment-xdr";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { fetchAccountSequence } from "@/src/services/api/stellar/stellar-sequence";

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
    }): Promise<{ hash?: string }> => {
      if (!canSend(input.account)) {
        throw new Error("This account cannot send payments");
      }

      const session = await getStoredCavosSession();

      if (session === null || session.address !== input.account.publicKey) {
        throw new CavosSessionExpiredError(
          "No active Cavos session for this account; reconnect to continue",
        );
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

      if (input.asset === undefined) {
        const signer = new CavosSigner(session);
        const result = await signer.signTransaction(unsignedXdr, {
          networkPassphrase,
        });

        return { hash: result.hash };
      }

      const { signedXdr } = await getCavosClient().signXdr(session, unsignedXdr);
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
    }): Promise<{ hash: string }> => {
      const session = await getStoredCavosSession();

      if (session === null || session.address !== input.account.publicKey) {
        throw new CavosSessionExpiredError(
          "No active Cavos session for this account; reconnect to continue",
        );
      }

      return getCavosClient().addTrustline(session, input.code, input.issuer);
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.account.publicKey),
      });
    },
  });
}
