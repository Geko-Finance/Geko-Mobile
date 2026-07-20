import {
  Account,
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";

import type { WalletAccount } from "@/src/domain/wallet";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";

import { CavosSigner } from "./cavos-signer";
import { CavosSessionExpiredError } from "./cavos-errors";
import { getStoredCavosSession } from "./cavos-session-storage";

export async function signTestCustodialPayment(
  account: WalletAccount,
): Promise<void> {
  const session = await getStoredCavosSession();

  if (session === null || session.address !== account.publicKey) {
    throw new CavosSessionExpiredError(
      "No active Cavos session for this account; reconnect to continue",
    );
  }

  const { networkPassphrase } = getActiveStellarNetwork();
  // Sequence "0" is safe here only because mock CavosClient.execute() never submits to Horizon;
  // a real integration must fetch the account's current sequence number first.
  const account_ = new Account(account.publicKey, "0");

  const unsignedXdr = new TransactionBuilder(account_, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: account.publicKey,
        asset: Asset.native(),
        amount: "1",
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();

  const signer = new CavosSigner(session);
  await signer.signTransaction(unsignedXdr, { networkPassphrase });
}
