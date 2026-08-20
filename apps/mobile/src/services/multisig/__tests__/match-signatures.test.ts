import { describe, expect, it } from "@jest/globals";
import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk/base";

import type { SignerEntry } from "@/src/domain/multisig";

import { matchedSignerKeys, matchSignatures } from "../match-signatures";

const buildTransaction = (sourcePublicKey: string): Transaction =>
  new TransactionBuilder(new Account(sourcePublicKey, "0"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        amount: "1",
        asset: Asset.native(),
        destination: sourcePublicKey,
      }),
    )
    .setTimeout(30)
    .build();

describe("matchSignatures", () => {
  it("matches a signature to its known signer", () => {
    const signerA = Keypair.random();
    const signerB = Keypair.random();
    const transaction = buildTransaction(signerA.publicKey());
    transaction.sign(signerA);

    const signers: SignerEntry[] = [
      { key: signerA.publicKey(), weight: 1 },
      { key: signerB.publicKey(), weight: 1 },
    ];
    const matches = matchSignatures(transaction, signers, "2026-01-01T00:00:00.000Z");

    expect(matches).toEqual([
      { signerKey: signerA.publicKey(), signedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("matches multiple co-signers once all have signed", () => {
    const signerA = Keypair.random();
    const signerB = Keypair.random();
    const transaction = buildTransaction(signerA.publicKey());
    transaction.sign(signerA);
    transaction.sign(signerB);

    const signers: SignerEntry[] = [
      { key: signerA.publicKey(), weight: 1 },
      { key: signerB.publicKey(), weight: 1 },
    ];

    expect(matchedSignerKeys(transaction, signers).sort()).toEqual(
      [signerA.publicKey(), signerB.publicKey()].sort(),
    );
  });

  it("silently skips a signature from a key that is not a known signer", () => {
    const signerA = Keypair.random();
    const unknownKey = Keypair.random();
    const transaction = buildTransaction(signerA.publicKey());
    transaction.sign(unknownKey);

    const signers: SignerEntry[] = [{ key: signerA.publicKey(), weight: 1 }];

    expect(matchedSignerKeys(transaction, signers)).toEqual([]);
  });

  it("returns no matches for an unsigned transaction", () => {
    const signerA = Keypair.random();
    const transaction = buildTransaction(signerA.publicKey());
    const signers: SignerEntry[] = [{ key: signerA.publicKey(), weight: 1 }];

    expect(matchedSignerKeys(transaction, signers)).toEqual([]);
  });
});
