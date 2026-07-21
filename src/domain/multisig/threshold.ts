// src/domain/multisig/threshold.ts
import {
  FeeBumpTransaction,
  Keypair,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-base";

import type {
  MultisigAccountConfig,
  MultisigThresholds,
  ThresholdCategory,
  ThresholdEvaluation,
} from "./types";

/**
 * Operation types requiring the account's HIGH threshold, per
 * https://developers.stellar.org/docs/learn/fundamentals/transactions/signatures-multisig#threshold-levels.
 * This list — and MEDIUM_THRESHOLD_OPERATION_TYPES below — only cover the operation types this
 * epic actually constructs (`setOptions` for signer/threshold management, `payment` for
 * proposals). Verify against that docs page, not this comment, before adding any other
 * operation type: the full protocol table is not encoded in any installed SDK (confirmed by
 * exploration), so this list is this app's only source of truth for it.
 */
const HIGH_THRESHOLD_OPERATION_TYPES: ReadonlySet<string> = new Set([
  "accountMerge",
  "setOptions",
]);

/** Operation types requiring only the account's LOW threshold. See the docblock above. */
const LOW_THRESHOLD_OPERATION_TYPES: ReadonlySet<string> = new Set([
  "allowTrust",
  "bumpSequence",
  "setTrustLineFlags",
]);

const CATEGORY_ORDER: ThresholdCategory[] = ["low", "medium", "high"];

/** Every operation defaults to MEDIUM unless explicitly listed as LOW or HIGH above. */
export function thresholdCategoryForOperationType(
  operationType: string
): ThresholdCategory {
  if (HIGH_THRESHOLD_OPERATION_TYPES.has(operationType)) {
    return "high";
  }

  if (LOW_THRESHOLD_OPERATION_TYPES.has(operationType)) {
    return "low";
  }

  return "medium";
}

/** A transaction's required category is the highest category among all of its operations. */
export function requiredThresholdCategoryForOperations(
  operationTypes: readonly string[]
): ThresholdCategory {
  let highestIndex = 0;

  for (const operationType of operationTypes) {
    const category = thresholdCategoryForOperationType(operationType);
    highestIndex = Math.max(highestIndex, CATEGORY_ORDER.indexOf(category));
  }

  return CATEGORY_ORDER[highestIndex];
}

export function requiredWeightForCategory(
  thresholds: MultisigThresholds,
  category: ThresholdCategory
): number {
  switch (category) {
    case "low":
      return thresholds.low;
    case "medium":
      return thresholds.medium;
    case "high":
      return thresholds.high;
  }
}

/** The 4-byte signature hint used to attribute a `DecoratedSignature` to a specific signer. */
export function computeSignatureHint(publicKey: string): Buffer {
  return Keypair.fromPublicKey(publicKey).signatureHint();
}

/**
 * Decodes an envelope XDR as a `Transaction`, rejecting fee-bump envelopes. Fee-bump
 * transactions are excluded via `instanceof FeeBumpTransaction` rather than a property-presence
 * check: `FeeBumpTransaction` (see `@stellar/stellar-base`'s `fee_bump_transaction.js`) defines
 * its own `operations` getter on its prototype that forwards to the inner transaction's
 * operations, so an `"operations" in decoded` (or `decoded.operations === undefined`) check would
 * NOT actually distinguish it from a plain `Transaction` — it would silently let fee-bump
 * envelopes through. `instanceof` is the only check that reliably rejects them.
 */
function decodeAsTransaction(
  envelopeXdr: string,
  networkPassphrase: string
): Transaction {
  const decoded = TransactionBuilder.fromXDR(envelopeXdr, networkPassphrase);

  if (decoded instanceof FeeBumpTransaction) {
    throw new Error(
      "Fee-bump transactions are not supported for multisig pending transactions"
    );
  }

  return decoded;
}

/**
 * Evaluates how much signer weight a signed (or partially-signed) envelope has collected
 * against an account's thresholds. Takes the envelope/passphrase directly rather than a full
 * `PendingTx` — callers evaluating a not-yet-persisted candidate (see Task 6's
 * `useProposePayment`) shouldn't need to invent a placeholder `id`/`sourceAccountId` just to
 * call this.
 */
export function evaluatePendingTx(
  envelopeXdr: string,
  networkPassphrase: string,
  config: MultisigAccountConfig
): ThresholdEvaluation {
  const transaction = decodeAsTransaction(envelopeXdr, networkPassphrase);

  const operationTypes = transaction.operations.map((operation) => operation.type);
  const category = requiredThresholdCategoryForOperations(operationTypes);
  const requiredWeight = requiredWeightForCategory(config.thresholds, category);

  const signerHints = config.signers.map((signer) => ({
    signer,
    hint: computeSignatureHint(signer.publicKey),
  }));

  const signedBy = new Set<string>();

  for (const decoratedSignature of transaction.signatures) {
    const signatureHint = decoratedSignature.hint();
    const match = signerHints.find(({ hint }) => hint.equals(signatureHint));

    if (match !== undefined) {
      signedBy.add(match.signer.publicKey);
    }
  }

  const collectedWeight = config.signers
    .filter((signer) => signedBy.has(signer.publicKey))
    .reduce((sum, signer) => sum + signer.weight, 0);

  return {
    requiredWeight,
    collectedWeight,
    isSatisfied: collectedWeight >= requiredWeight,
    signedBy: Array.from(signedBy),
  };
}

/**
 * True if this signer configuration's total weight can't meet its own low threshold — i.e. the
 * account could become permanently unable to sign anything, including a future correction.
 * Callers must check this BEFORE submitting any signer/threshold change and require an explicit
 * confirmation if it returns true (see Task 7).
 */
export function wouldRiskPermanentLockout(config: MultisigAccountConfig): boolean {
  const totalWeight = config.signers.reduce((sum, signer) => sum + signer.weight, 0);
  return totalWeight < config.thresholds.low;
}

/** A stable identifier for a pending transaction, unchanged as signatures are added or merged. */
export function pendingTxIdForXdr(xdr: string, networkPassphrase: string): string {
  const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  return transaction.hash().toString("hex");
}

/**
 * Merges the signatures present on `incomingXdr` into `existingXdr`, skipping any signature
 * already present (by hint + raw signature bytes) — used when a co-signer's re-shared QR needs
 * to be combined with this device's own local copy of the same pending transaction, since the
 * round-robin sharing pattern has no central coordinator to guarantee a strict linear order.
 */
export function mergeSignatures(
  existingXdr: string,
  incomingXdr: string,
  networkPassphrase: string
): string {
  const existing = decodeAsTransaction(existingXdr, networkPassphrase);
  const incoming = decodeAsTransaction(incomingXdr, networkPassphrase);

  for (const incomingSignature of incoming.signatures) {
    const alreadyPresent = existing.signatures.some(
      (existingSignature) =>
        existingSignature.hint().equals(incomingSignature.hint()) &&
        existingSignature.signature().equals(incomingSignature.signature())
    );

    if (!alreadyPresent) {
      existing.addDecoratedSignature(incomingSignature);
    }
  }

  return existing.toXDR();
}
