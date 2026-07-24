import type { WalletAccount } from "@/src/domain/wallet";
import { buildNativePaymentXdr } from "@/src/services/api/stellar/payment-xdr";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";

import { CavosSigner } from "./cavos-signer";

export async function signTestCustodialPayment(
  account: WalletAccount,
): Promise<void> {
  const { networkPassphrase } = getActiveStellarNetwork();
  // Sequence "0" is safe here only because Cavos execute() ignores the passed sequence
  // and builds its own tx internally from amount+destination.
  const unsignedXdr = buildNativePaymentXdr({
    sourcePublicKey: account.publicKey,
    sourceSequence: "0",
    destinationPublicKey: account.publicKey,
    amountXlm: "1",
    networkPassphrase,
  });

  const signer = new CavosSigner(account.id, account.publicKey);
  await signer.signTransaction(unsignedXdr, { networkPassphrase });
}
