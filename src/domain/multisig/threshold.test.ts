// src/domain/multisig/threshold.test.ts
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import {
  applySignerConfigChange,
  applySignerConfigChanges,
  computeSignatureHint,
  evaluatePendingTx,
  mergeSignatures,
  pendingTxIdForXdr,
  requiredThresholdCategoryForOperations,
  requiredWeightForCategory,
  thresholdCategoryForOperationType,
  wouldFreezeAccountConfig,
  wouldRiskPermanentLockout,
} from "./threshold";
import type { MultisigAccountConfig } from "./types";

const NETWORK_PASSPHRASE = Networks.TESTNET;

function buildUnsignedPaymentXdr(
  sourcePublicKey: string,
  destinationPublicKey: string,
  sequence = "0"
): string {
  const account = new Account(sourcePublicKey, sequence);
  return new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount: "1",
      })
    )
    .setTimeout(30)
    .build()
    .toXDR();
}

function buildUnsignedSetOptionsXdr(
  sourcePublicKey: string,
  sequence = "0"
): string {
  const account = new Account(sourcePublicKey, sequence);
  return new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.setOptions({ masterWeight: 1 }))
    .setTimeout(30)
    .build()
    .toXDR();
}

function signXdr(xdr: string, keypair: Keypair): string {
  const transaction = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
  transaction.sign(keypair);
  return transaction.toXDR();
}

function buildFeeBumpXdr(
  source: Keypair,
  destinationPublicKey: string,
  feeSource: Keypair
): string {
  const innerXdr = signXdr(
    buildUnsignedPaymentXdr(source.publicKey(), destinationPublicKey),
    source
  );
  const innerTransaction = TransactionBuilder.fromXDR(
    innerXdr,
    NETWORK_PASSPHRASE
  ) as Transaction;
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    "200",
    innerTransaction,
    NETWORK_PASSPHRASE
  );
  return feeBump.toXDR();
}

describe("thresholdCategoryForOperationType / requiredThresholdCategoryForOperations", () => {
  it("categorizes setOptions as high", () => {
    expect(thresholdCategoryForOperationType("setOptions")).toBe("high");
  });

  it("categorizes payment as medium", () => {
    expect(thresholdCategoryForOperationType("payment")).toBe("medium");
  });

  it("defaults an unlisted operation type to medium", () => {
    expect(thresholdCategoryForOperationType("createAccount")).toBe("medium");
  });

  it("picks the highest category across multiple operations", () => {
    expect(
      requiredThresholdCategoryForOperations(["payment", "setOptions"])
    ).toBe("high");
    expect(requiredThresholdCategoryForOperations(["payment"])).toBe("medium");
  });
});

describe("requiredWeightForCategory", () => {
  const thresholds = { low: 1, medium: 2, high: 3 };

  it("returns the matching threshold", () => {
    expect(requiredWeightForCategory(thresholds, "low")).toBe(1);
    expect(requiredWeightForCategory(thresholds, "medium")).toBe(2);
    expect(requiredWeightForCategory(thresholds, "high")).toBe(3);
  });
});

describe("computeSignatureHint", () => {
  it("matches the real Keypair.signatureHint() for the same key", () => {
    const keypair = Keypair.random();
    const hint = computeSignatureHint(keypair.publicKey());

    expect(hint.equals(keypair.signatureHint())).toBe(true);
  });
});

describe("evaluatePendingTx", () => {
  it("reports zero collected weight for an unsigned payment", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: source.publicKey(), weight: 1 },
        { publicKey: cosigner.publicKey(), weight: 1 },
      ],
      thresholds: { low: 1, medium: 2, high: 2 },
    };
    const envelopeXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );

    const evaluation = evaluatePendingTx(
      envelopeXdr,
      NETWORK_PASSPHRASE,
      config
    );

    expect(evaluation.requiredWeight).toBe(2);
    expect(evaluation.collectedWeight).toBe(0);
    expect(evaluation.isSatisfied).toBe(false);
    expect(evaluation.signedBy).toEqual([]);
  });

  it("attributes weight correctly as signatures are added, and reports satisfaction once threshold is met", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: source.publicKey(), weight: 1 },
        { publicKey: cosigner.publicKey(), weight: 1 },
      ],
      thresholds: { low: 1, medium: 2, high: 2 },
    };
    const unsignedXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );
    const oneSignatureXdr = signXdr(unsignedXdr, source);

    const afterOneSignature = evaluatePendingTx(
      oneSignatureXdr,
      NETWORK_PASSPHRASE,
      config
    );

    expect(afterOneSignature.collectedWeight).toBe(1);
    expect(afterOneSignature.isSatisfied).toBe(false);
    expect(afterOneSignature.signedBy).toEqual([source.publicKey()]);

    const twoSignaturesXdr = signXdr(oneSignatureXdr, cosigner);

    const afterTwoSignatures = evaluatePendingTx(
      twoSignaturesXdr,
      NETWORK_PASSPHRASE,
      config
    );

    expect(afterTwoSignatures.collectedWeight).toBe(2);
    expect(afterTwoSignatures.isSatisfied).toBe(true);
    expect(afterTwoSignatures.signedBy.sort()).toEqual(
      [source.publicKey(), cosigner.publicKey()].sort()
    );
  });

  it("requires the high threshold for a setOptions transaction", () => {
    const source = Keypair.random();
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: source.publicKey(), weight: 1 }],
      thresholds: { low: 1, medium: 1, high: 5 },
    };
    const signedXdr = signXdr(
      buildUnsignedSetOptionsXdr(source.publicKey()),
      source
    );

    const evaluation = evaluatePendingTx(signedXdr, NETWORK_PASSPHRASE, config);

    expect(evaluation.requiredWeight).toBe(5);
    expect(evaluation.collectedWeight).toBe(1);
    expect(evaluation.isSatisfied).toBe(false);
  });

  it("ignores a signature that doesn't match any known signer", () => {
    const source = Keypair.random();
    const stranger = Keypair.random();
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: source.publicKey(), weight: 1 }],
      thresholds: { low: 1, medium: 1, high: 1 },
    };
    const signedByStranger = signXdr(
      buildUnsignedPaymentXdr(source.publicKey(), source.publicKey()),
      stranger
    );

    const evaluation = evaluatePendingTx(
      signedByStranger,
      NETWORK_PASSPHRASE,
      config
    );

    expect(evaluation.collectedWeight).toBe(0);
    expect(evaluation.signedBy).toEqual([]);
  });
});

describe("wouldRiskPermanentLockout", () => {
  it("flags a config whose total signer weight can't meet its own low threshold", () => {
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: Keypair.random().publicKey(), weight: 1 }],
      thresholds: { low: 2, medium: 2, high: 2 },
    };

    expect(wouldRiskPermanentLockout(config)).toBe(true);
  });

  it("does not flag a config with enough total weight", () => {
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: Keypair.random().publicKey(), weight: 1 },
        { publicKey: Keypair.random().publicKey(), weight: 1 },
      ],
      thresholds: { low: 2, medium: 2, high: 2 },
    };

    expect(wouldRiskPermanentLockout(config)).toBe(false);
  });
});

describe("wouldFreezeAccountConfig", () => {
  it("flags a config whose total weight is below the low threshold (existing lockout case, still works)", () => {
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: Keypair.random().publicKey(), weight: 1 }],
      thresholds: { low: 2, medium: 3, high: 4 },
    };

    expect(wouldFreezeAccountConfig(config)).toBe(true);
  });

  it("flags a config whose total weight meets low/medium but falls short of the high threshold", () => {
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: Keypair.random().publicKey(), weight: 3 }],
      thresholds: { low: 2, medium: 3, high: 4 },
    };

    // Still able to pay (meets low and medium) but can never run another SetOptions again.
    expect(wouldRiskPermanentLockout(config)).toBe(false);
    expect(wouldFreezeAccountConfig(config)).toBe(true);
  });

  it("does not flag a config whose total weight meets the high threshold", () => {
    const config: MultisigAccountConfig = {
      signers: [{ publicKey: Keypair.random().publicKey(), weight: 4 }],
      thresholds: { low: 2, medium: 3, high: 4 },
    };

    expect(wouldFreezeAccountConfig(config)).toBe(false);
  });
});

describe("applySignerConfigChange / applySignerConfigChanges", () => {
  const masterKey = Keypair.random().publicKey();
  const baseConfig: MultisigAccountConfig = {
    signers: [{ publicKey: masterKey, weight: 2 }],
    thresholds: { low: 2, medium: 2, high: 2 },
  };

  it("adds a brand-new signer without touching existing signers", () => {
    const newSigner = Keypair.random().publicKey();

    const result = applySignerConfigChange(baseConfig, {
      kind: "addOrUpdateSigner",
      publicKey: newSigner,
      weight: 1,
    });

    expect(result.signers).toEqual([
      { publicKey: masterKey, weight: 2 },
      { publicKey: newSigner, weight: 1 },
    ]);
    expect(result.thresholds).toBe(baseConfig.thresholds);
  });

  it("replaces (not appends) an existing signer's entry when re-adding the same key with a new weight", () => {
    // This is the exact scenario that previously broke: re-adding signerA's own key with a lower
    // weight must REPLACE signerA's entry, matching Stellar's own setOptions semantics, not
    // produce a second entry that double-counts total weight.
    const signerA = Keypair.random().publicKey();
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: masterKey, weight: 2 },
        { publicKey: signerA, weight: 2 },
      ],
      thresholds: { low: 3, medium: 3, high: 3 },
    };

    const result = applySignerConfigChange(config, {
      kind: "addOrUpdateSigner",
      publicKey: signerA,
      weight: 0,
    });

    expect(result.signers).toEqual([
      { publicKey: masterKey, weight: 2 },
      { publicKey: signerA, weight: 0 },
    ]);
    // Total weight is now 2, below the low threshold of 3 — the bug this guards against made the
    // old (buggy) computation report a total of 4 instead, silently hiding the lockout risk.
    expect(wouldRiskPermanentLockout(result)).toBe(true);
  });

  it("removes a signer entirely", () => {
    const signerA = Keypair.random().publicKey();
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: masterKey, weight: 2 },
        { publicKey: signerA, weight: 1 },
      ],
      thresholds: { low: 2, medium: 2, high: 2 },
    };

    const result = applySignerConfigChange(config, {
      kind: "removeSigner",
      publicKey: signerA,
    });

    expect(result.signers).toEqual([{ publicKey: masterKey, weight: 2 }]);
  });

  it("merges only the provided threshold fields, leaving the rest unchanged", () => {
    const result = applySignerConfigChange(baseConfig, {
      kind: "setThresholds",
      thresholds: { high: 5 },
    });

    expect(result.thresholds).toEqual({ low: 2, medium: 2, high: 5 });
    expect(result.signers).toBe(baseConfig.signers);
  });

  it("applySignerConfigChanges folds multiple changes in order, e.g. adding a signer and raising thresholds together", () => {
    const newSigner = Keypair.random().publicKey();

    const result = applySignerConfigChanges(baseConfig, [
      { kind: "addOrUpdateSigner", publicKey: newSigner, weight: 2 },
      { kind: "setThresholds", thresholds: { low: 4, medium: 4, high: 4 } },
    ]);

    expect(result.signers).toEqual([
      { publicKey: masterKey, weight: 2 },
      { publicKey: newSigner, weight: 2 },
    ]);
    expect(result.thresholds).toEqual({ low: 4, medium: 4, high: 4 });
    // Combined, this is now a genuine 2-of-2: neither signer alone can meet the new threshold.
    expect(wouldRiskPermanentLockout(result)).toBe(false);
    expect(wouldFreezeAccountConfig(result)).toBe(false);
  });
});

describe("pendingTxIdForXdr", () => {
  it("is stable across adding a signature to the same underlying transaction", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const unsignedXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );
    const signedXdr = signXdr(unsignedXdr, source);

    expect(pendingTxIdForXdr(signedXdr, NETWORK_PASSPHRASE)).toBe(
      pendingTxIdForXdr(unsignedXdr, NETWORK_PASSPHRASE)
    );
  });

  it("differs for a different underlying transaction", () => {
    const source = Keypair.random();
    const cosignerA = Keypair.random();
    const cosignerB = Keypair.random();

    expect(
      pendingTxIdForXdr(
        buildUnsignedPaymentXdr(source.publicKey(), cosignerA.publicKey()),
        NETWORK_PASSPHRASE
      )
    ).not.toBe(
      pendingTxIdForXdr(
        buildUnsignedPaymentXdr(
          source.publicKey(),
          cosignerB.publicKey(),
          "1"
        ),
        NETWORK_PASSPHRASE
      )
    );
  });
});

describe("mergeSignatures", () => {
  it("unions signatures from two independently-signed copies of the same transaction", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const unsignedXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );
    const signedByFirst = signXdr(unsignedXdr, source);
    const signedByCosigner = signXdr(unsignedXdr, cosigner);

    const merged = mergeSignatures(
      signedByFirst,
      signedByCosigner,
      NETWORK_PASSPHRASE
    );
    const mergedTransaction = TransactionBuilder.fromXDR(
      merged,
      NETWORK_PASSPHRASE
    );

    expect(mergedTransaction.signatures).toHaveLength(2);
  });

  it("does not duplicate a signature already present in both copies", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const unsignedXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );
    const bothSigned = signXdr(signXdr(unsignedXdr, source), cosigner);

    const merged = mergeSignatures(bothSigned, bothSigned, NETWORK_PASSPHRASE);
    const mergedTransaction = TransactionBuilder.fromXDR(
      merged,
      NETWORK_PASSPHRASE
    );

    expect(mergedTransaction.signatures).toHaveLength(2);
  });
});

describe("fee-bump rejection", () => {
  it("evaluatePendingTx throws on a real fee-bump envelope instead of silently evaluating the inner transaction", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const feeSource = Keypair.random();
    const config: MultisigAccountConfig = {
      signers: [
        { publicKey: source.publicKey(), weight: 1 },
        { publicKey: cosigner.publicKey(), weight: 1 },
      ],
      thresholds: { low: 1, medium: 2, high: 2 },
    };
    const feeBumpXdr = buildFeeBumpXdr(
      source,
      cosigner.publicKey(),
      feeSource
    );

    expect(() =>
      evaluatePendingTx(feeBumpXdr, NETWORK_PASSPHRASE, config)
    ).toThrow(/fee-bump/i);
  });

  it("mergeSignatures throws on a real fee-bump envelope", () => {
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const feeSource = Keypair.random();
    const unsignedXdr = buildUnsignedPaymentXdr(
      source.publicKey(),
      cosigner.publicKey()
    );
    const signedXdr = signXdr(unsignedXdr, source);
    const feeBumpXdr = buildFeeBumpXdr(
      source,
      cosigner.publicKey(),
      feeSource
    );

    expect(() =>
      mergeSignatures(signedXdr, feeBumpXdr, NETWORK_PASSPHRASE)
    ).toThrow(/fee-bump/i);
  });
});
