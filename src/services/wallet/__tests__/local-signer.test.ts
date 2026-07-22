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

    const signedXdr = await signer.signTransaction(
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
});
