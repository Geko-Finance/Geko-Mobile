import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { MultisigAccount } from "@/src/domain/multisig";
import type { WalletAccount } from "@/src/domain/wallet";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { buildSetOptionsXdr } from "@/src/services/api/stellar/set-options-xdr";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { fetchAccountSequence } from "@/src/services/api/stellar/stellar-sequence";
import type { WalletPinProvider } from "@/src/services/wallet/local-signer";

import { multisigKeys } from "./multisig-queries";
import { type ProposeOutcome, proposeOperation } from "./propose-flow";

/**
 * Adds/removes a signer and/or changes thresholds on a self-custody multisig account.
 * Always routes through the shared propose->collect->submit flow (see propose-flow.ts) -
 * there is deliberately no separate "signer management" submit path. A brand-new 1-of-1
 * account converting to its first extra signer submits immediately (the proposer's own
 * signature alone already meets the account's current threshold); any change after that
 * follows the same threshold check as every other proposal.
 */
export function useUpdateSigners() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      multisigAccount: MultisigAccount;
      ownerUserId: string;
      signer?: { publicKey: string; weight: number };
      masterWeight?: number;
      thresholds?: { low?: number; med?: number; high?: number };
      pinProvider: WalletPinProvider;
    }): Promise<ProposeOutcome> => {
      if (input.account.custody !== "non_custodial") {
        throw new Error(
          "Multisig is only available for self-custody accounts",
        );
      }

      const { networkPassphrase } = getActiveStellarNetwork();
      const sequence = await fetchAccountSequence(input.account.publicKey);
      const unsignedXdr = buildSetOptionsXdr({
        sourcePublicKey: input.account.publicKey,
        sourceSequence: sequence,
        networkPassphrase,
        signer: input.signer,
        masterWeight: input.masterWeight,
        lowThreshold: input.thresholds?.low,
        medThreshold: input.thresholds?.med,
        highThreshold: input.thresholds?.high,
      });

      return proposeOperation({
        account: input.multisigAccount,
        operationKind: "set_options",
        unsignedXdr,
        networkPassphrase,
        ownerUserId: input.ownerUserId,
        pinProvider: input.pinProvider,
      });
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: multisigKeys.account(networkId, input.account.publicKey),
      });
    },
  });
}
