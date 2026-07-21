import "@/src/services/crypto/crypto-polyfill";

import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { SigningKeypair } from "@stellar/typescript-wallet-sdk";

import { LocalWalletSigner, persistSigningSecret } from "./local-signer";

function buildUnsignedTestXdr(sourcePublicKey: string): string {
  const account = new Account(sourcePublicKey, "0");
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: sourcePublicKey,
        asset: Asset.native(),
        amount: "1",
      })
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

describe("LocalWalletSigner", () => {
  it("signs a transaction with the account's own key and produces a valid signature", async () => {
    const keypair = SigningKeypair.fromSecret(Keypair.random().secret());
    await persistSigningSecret(keypair.publicKey, keypair.secretKey);

    const signer = new LocalWalletSigner(keypair.publicKey);

    expect(await signer.getPublicKey()).toBe(keypair.publicKey);
    expect(await signer.getAddress()).toBe(keypair.publicKey);

    const unsignedXdr = buildUnsignedTestXdr(keypair.publicKey);
    const signedXdr = await signer.signTransaction(unsignedXdr, {
      networkPassphrase: Networks.TESTNET,
    });

    expect(signedXdr).not.toBe(unsignedXdr);

    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr,
      Networks.TESTNET
    );

    expect(signedTransaction.signatures).toHaveLength(1);

    const rawKeypair = Keypair.fromPublicKey(keypair.publicKey);
    const isValidSignature = rawKeypair.verify(
      signedTransaction.hash(),
      signedTransaction.signatures[0].signature()
    );

    expect(isValidSignature).toBe(true);
  });

  it("throws when no signing key is stored for the account", async () => {
    const signer = new LocalWalletSigner(
      "GDOESNOTEXISTINSECURESTORE00000000000000000000000000000"
    );

    await expect(signer.getPublicKey()).rejects.toThrow(/no signing key/i);
  });
});
