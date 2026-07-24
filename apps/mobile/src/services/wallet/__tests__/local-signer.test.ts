import { describe, expect, it, jest } from "@jest/globals";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";

import { LocalSigner } from "../local-signer";
import {
  generateLocalWalletMaterial,
  importLocalWalletMaterial,
  storeLocalWalletMaterial,
} from "../local-wallet-service";

const MNEMONIC =
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";

const buildTransaction = (publicKey: string): string =>
  new TransactionBuilder(new Account(publicKey, "0"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        amount: "0.0000001",
        asset: Asset.native(),
        destination: publicKey,
      })
    )
    .setTimeout(30)
    .build()
    .toXDR();

describe("LocalSigner", () => {
  it("authorizes before decrypting and returns signed XDR", async () => {
    const material = importLocalWalletMaterial(MNEMONIC);
    await storeLocalWalletMaterial(material, "123456");
    const order: string[] = [];
    const signer = new LocalSigner({
      authorizer: {
        authorize: async () => {
          order.push("biometric");
        },
      },
      pinProvider: async () => {
        order.push("pin");
        return "123456";
      },
      publicKey: material.publicKey,
    });

    const { xdr: signedXdr } = await signer.signTransaction(
      buildTransaction(material.publicKey),
      { networkPassphrase: Networks.TESTNET }
    );
    const signed = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    const signature = signed.signatures[0]?.signature();

    expect(order).toEqual(["biometric", "pin"]);
    expect(signed.signatures).toHaveLength(1);
    expect(signature).toBeDefined();
    expect(
      Keypair.fromPublicKey(material.publicKey).verify(
        signed.hash(),
        signature!
      )
    ).toBe(true);
  });

  it("does not request the PIN when biometrics fail", async () => {
    const pinProvider = jest.fn(async () => "123456");
    const signer = new LocalSigner({
      authorizer: {
        authorize: async () => {
          throw new Error("cancelled");
        },
      },
      pinProvider,
      publicKey: importLocalWalletMaterial(MNEMONIC).publicKey,
    });

    await expect(
      signer.signTransaction(
        buildTransaction(await signer.getPublicKey()),
        { networkPassphrase: Networks.TESTNET }
      )
    ).rejects.toThrow("cancelled");
    expect(pinProvider).not.toHaveBeenCalled();
  });

  it("appends a second co-signer's signature instead of replacing the first, for multisig", async () => {
    const materialA = importLocalWalletMaterial(MNEMONIC);
    await storeLocalWalletMaterial(materialA, "123456");
    const materialB = generateLocalWalletMaterial();
    await storeLocalWalletMaterial(materialB, "654321");

    const signerA = new LocalSigner({
      authorizer: { authorize: async () => {} },
      pinProvider: async () => "123456",
      publicKey: materialA.publicKey,
    });
    const signerB = new LocalSigner({
      authorizer: { authorize: async () => {} },
      pinProvider: async () => "654321",
      publicKey: materialB.publicKey,
    });

    const { xdr: signedByA } = await signerA.signTransaction(
      buildTransaction(materialA.publicKey),
      { networkPassphrase: Networks.TESTNET }
    );
    const { xdr: signedByBoth } = await signerB.signTransaction(signedByA, {
      networkPassphrase: Networks.TESTNET,
    });

    const transaction = TransactionBuilder.fromXDR(
      signedByBoth,
      Networks.TESTNET
    );

    expect(transaction.signatures).toHaveLength(2);
    const verifiesAgainst = (publicKey: string) =>
      transaction.signatures.some((decoratedSignature) =>
        Keypair.fromPublicKey(publicKey).verify(
          transaction.hash(),
          decoratedSignature.signature()
        )
      );

    expect(verifiesAgainst(materialA.publicKey)).toBe(true);
    expect(verifiesAgainst(materialB.publicKey)).toBe(true);
  });
});
