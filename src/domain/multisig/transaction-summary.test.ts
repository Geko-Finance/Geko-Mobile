// src/domain/multisig/transaction-summary.test.ts
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { describeTransactionOperations } from "./transaction-summary";

const NETWORK_PASSPHRASE = Networks.TESTNET;

function buildXdr(sourcePublicKey: string, operations: xdr.Operation[]): string {
  const account = new Account(sourcePublicKey, "0");
  let builder = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const operation of operations) {
    builder = builder.addOperation(operation);
  }

  return builder.setTimeout(30).build().toXDR();
}

describe("describeTransactionOperations", () => {
  it("summarizes a native-asset payment operation", () => {
    const source = Keypair.random();
    const destination = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.payment({
        destination: destination.publicKey(),
        asset: Asset.native(),
        amount: "12.5",
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "payment",
        destination: destination.publicKey(),
        // stellar-base normalizes amounts to 7 decimal places on encode/decode.
        amount: "12.5000000",
        assetCode: "XLM",
        assetIssuer: undefined,
      },
    ]);
  });

  it("summarizes an issued-asset payment operation, including the issuer", () => {
    const source = Keypair.random();
    const destination = Keypair.random();
    const issuer = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.payment({
        destination: destination.publicKey(),
        asset: new Asset("USDC", issuer.publicKey()),
        amount: "100",
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "payment",
        destination: destination.publicKey(),
        amount: "100.0000000",
        assetCode: "USDC",
        assetIssuer: issuer.publicKey(),
      },
    ]);
  });

  it("summarizes a setOptions operation adding a new signer", () => {
    const source = Keypair.random();
    const newSigner = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.setOptions({
        signer: { ed25519PublicKey: newSigner.publicKey(), weight: 2 },
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "setOptions",
        signerChange: { publicKey: newSigner.publicKey(), weight: 2 },
        hasNonKeySignerChange: undefined,
        lowThreshold: undefined,
        medThreshold: undefined,
        highThreshold: undefined,
        masterWeight: undefined,
        homeDomain: undefined,
      },
    ]);
  });

  it("summarizes a setOptions operation removing a signer via weight 0", () => {
    const source = Keypair.random();
    const existingSigner = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.setOptions({
        signer: { ed25519PublicKey: existingSigner.publicKey(), weight: 0 },
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries[0]).toMatchObject({
      type: "setOptions",
      signerChange: { publicKey: existingSigner.publicKey(), weight: 0 },
    });
  });

  it("summarizes a setOptions operation combining a threshold change and a master-weight change in one operation", () => {
    const source = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.setOptions({
        lowThreshold: 2,
        medThreshold: 3,
        highThreshold: 4,
        masterWeight: 0,
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "setOptions",
        signerChange: undefined,
        hasNonKeySignerChange: undefined,
        lowThreshold: 2,
        medThreshold: 3,
        highThreshold: 4,
        masterWeight: 0,
        homeDomain: undefined,
      },
    ]);
  });

  it("summarizes an accountMerge operation, showing the destination it transfers the entire balance to", () => {
    const source = Keypair.random();
    const destination = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.accountMerge({ destination: destination.publicKey() }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      { type: "accountMerge", destination: destination.publicKey() },
    ]);
  });

  it("summarizes a pathPaymentStrictReceive operation (sendMax / exact destAmount)", () => {
    const source = Keypair.random();
    const destination = Keypair.random();
    const issuer = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "50",
        destination: destination.publicKey(),
        destAsset: new Asset("USDC", issuer.publicKey()),
        destAmount: "10",
        path: [],
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "pathPaymentStrictReceive",
        destination: destination.publicKey(),
        sendAssetCode: "XLM",
        sendAssetIssuer: undefined,
        destAssetCode: "USDC",
        destAssetIssuer: issuer.publicKey(),
        sendAmount: "50.0000000",
        destAmount: "10.0000000",
      },
    ]);
  });

  it("summarizes a pathPaymentStrictSend operation (exact sendAmount / destMin)", () => {
    const source = Keypair.random();
    const destination = Keypair.random();
    const issuer = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [
      Operation.pathPaymentStrictSend({
        sendAsset: new Asset("USDC", issuer.publicKey()),
        sendAmount: "10",
        destination: destination.publicKey(),
        destAsset: Asset.native(),
        destMin: "45",
        path: [],
      }),
    ]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([
      {
        type: "pathPaymentStrictSend",
        destination: destination.publicKey(),
        sendAssetCode: "USDC",
        sendAssetIssuer: issuer.publicKey(),
        destAssetCode: "XLM",
        destAssetIssuer: undefined,
        sendAmount: "10.0000000",
        destAmount: "45.0000000",
      },
    ]);
  });

  it("falls back to a generic 'other' summary for an operation type with no dedicated summary", () => {
    const source = Keypair.random();

    const xdr = buildXdr(source.publicKey(), [Operation.bumpSequence({ bumpTo: "100" })]);

    const summaries = describeTransactionOperations(xdr, NETWORK_PASSPHRASE);

    expect(summaries).toEqual([{ type: "other", operationType: "bumpSequence" }]);
  });

  it("throws on a real fee-bump envelope instead of silently describing the inner transaction", () => {
    const source = Keypair.random();
    const destination = Keypair.random();
    const feeSource = Keypair.random();

    const innerXdr = buildXdr(source.publicKey(), [
      Operation.payment({
        destination: destination.publicKey(),
        asset: Asset.native(),
        amount: "1",
      }),
    ]);
    const innerTransaction = TransactionBuilder.fromXDR(innerXdr, NETWORK_PASSPHRASE);
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      feeSource,
      "200",
      innerTransaction as Parameters<typeof TransactionBuilder.buildFeeBumpTransaction>[2],
      NETWORK_PASSPHRASE
    );

    expect(() => describeTransactionOperations(feeBump.toXDR(), NETWORK_PASSPHRASE)).toThrow(
      /fee-bump/i
    );
  });
});
