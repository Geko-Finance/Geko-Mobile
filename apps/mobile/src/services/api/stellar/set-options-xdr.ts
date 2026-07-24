import { Account, BASE_FEE, Operation, TransactionBuilder } from "@stellar/stellar-base";

/**
 * Builds an unsigned `SetOptions` transaction envelope for managing multisig signers and
 * thresholds. A single operation can add/update/remove a signer (weight 0 removes it) and
 * change thresholds in the same transaction - pass only the fields that need to change.
 */
export function buildSetOptionsXdr(params: {
  sourcePublicKey: string;
  sourceSequence: string;
  networkPassphrase: string;
  signer?: { publicKey: string; weight: number };
  masterWeight?: number;
  lowThreshold?: number;
  medThreshold?: number;
  highThreshold?: number;
}): string {
  const account = new Account(params.sourcePublicKey, params.sourceSequence);

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: params.networkPassphrase,
  })
    .addOperation(
      Operation.setOptions({
        ...(params.signer === undefined
          ? {}
          : {
              signer: {
                ed25519PublicKey: params.signer.publicKey,
                weight: params.signer.weight,
              },
            }),
        masterWeight: params.masterWeight,
        lowThreshold: params.lowThreshold,
        medThreshold: params.medThreshold,
        highThreshold: params.highThreshold,
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();
}
