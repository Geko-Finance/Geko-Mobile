import { describe, expect, it } from "@jest/globals";
import {
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  type Signer,
} from "@stellar/stellar-base";

import { buildSetOptionsXdr } from "../set-options-xdr";

const SOURCE = Keypair.random().publicKey();
const CO_SIGNER = Keypair.random().publicKey();

const decodeSetOptionsOp = (xdr: string) => {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  if (!("operations" in tx)) {
    throw new Error("Expected a single Transaction, not a fee-bump envelope");
  }
  const [operation] = tx.operations;
  if (operation === undefined || operation.type !== "setOptions") {
    throw new Error("Expected a setOptions operation");
  }
  return operation as Operation.SetOptions;
};

/** This test only ever builds ed25519PublicKey signers - narrow the union for assertions. */
const asEd25519Signer = (
  signer: Operation.SetOptions["signer"],
): Signer.Ed25519PublicKey => {
  if (signer === undefined || !("ed25519PublicKey" in signer)) {
    throw new Error("Expected an ed25519PublicKey signer");
  }
  return signer;
};

describe("buildSetOptionsXdr", () => {
  it("builds a decodable envelope adding a signer with a weight", () => {
    const xdr = buildSetOptionsXdr({
      sourcePublicKey: SOURCE,
      sourceSequence: "0",
      networkPassphrase: Networks.TESTNET,
      signer: { publicKey: CO_SIGNER, weight: 1 },
    });

    const op = decodeSetOptionsOp(xdr);
    const signer = asEd25519Signer(op.signer);

    expect(signer.ed25519PublicKey).toBe(CO_SIGNER);
    expect(signer.weight).toBe(1);
  });

  it("builds an envelope removing a signer via weight 0", () => {
    const xdr = buildSetOptionsXdr({
      sourcePublicKey: SOURCE,
      sourceSequence: "0",
      networkPassphrase: Networks.TESTNET,
      signer: { publicKey: CO_SIGNER, weight: 0 },
    });

    const op = decodeSetOptionsOp(xdr);
    const signer = asEd25519Signer(op.signer);

    expect(signer.weight).toBe(0);
  });

  it("builds a threshold-only envelope with no signer change", () => {
    const xdr = buildSetOptionsXdr({
      sourcePublicKey: SOURCE,
      sourceSequence: "0",
      networkPassphrase: Networks.TESTNET,
      lowThreshold: 1,
      medThreshold: 2,
      highThreshold: 2,
    });

    const op = decodeSetOptionsOp(xdr);

    expect(op.signer).toBeUndefined();
    expect(op.lowThreshold).toBe(1);
    expect(op.medThreshold).toBe(2);
    expect(op.highThreshold).toBe(2);
  });
});
