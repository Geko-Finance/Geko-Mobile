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
 *
 * Exported (not just used internally) so `src/domain/multisig/transaction-summary.ts` can reuse
 * the same fee-bump-rejection behavior instead of duplicating it.
 */
export function decodeAsTransaction(
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
 *
 * IMPORTANT — scope boundary: this only matches signature HINTS (the 4-byte, non-secret
 * `DecoratedSignature.hint()`) against known signers' public keys; it does not cryptographically
 * verify the signatures themselves. Final signature validity is always checked by Horizon at
 * submission time — a transaction reported as `isSatisfied: true` here can still be rejected on
 * submit if any attached signature is actually invalid (e.g. `tx_bad_auth`). This is a deliberate
 * scope boundary, not an oversight: real verification would duplicate what the network already
 * guarantees, at the cost of meaningful added complexity, and a bad signature can never move
 * funds regardless of what this function reports — it can only cause a submit-time rejection
 * where the UI locally believed the threshold was already met. Do not treat `isSatisfied` as
 * proof of cryptographically valid signatures.
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

/**
 * True if this signer configuration's total weight would fall below its own HIGH threshold. This
 * is a DIFFERENT risk than `wouldRiskPermanentLockout`: an account can be below `high` while still
 * meeting `low`/`medium`, so it stays able to pay — but `SetOptions` (the ONLY operation type that
 * can ever change signers or thresholds again, see `thresholdCategoryForOperationType`) always
 * requires the account's HIGH threshold, regardless of what's being changed. A resulting config
 * below its own high threshold is therefore a one-way door: the account can never add a signer
 * back, lower a threshold, or unlock the master key again — it is permanently frozen for its own
 * future configuration, even though it can still transact normally.
 *
 * Callers must check this IN ADDITION TO `wouldRiskPermanentLockout` before submitting any signer
 * or threshold change (see `SignerManagementScreen`), and should warn with distinct wording from
 * the low-threshold case: this is not "unable to sign anything", it's "unable to ever change
 * signers/thresholds again".
 */
export function wouldFreezeAccountConfig(config: MultisigAccountConfig): boolean {
  const totalWeight = config.signers.reduce((sum, signer) => sum + signer.weight, 0);
  return totalWeight < config.thresholds.high;
}

/**
 * A pure description of one proposed change to a signer configuration, used to compute a
 * RESULTING config before submission — see `applySignerConfigChange`.
 */
export type SignerConfigChange =
  | { readonly kind: "addOrUpdateSigner"; readonly publicKey: string; readonly weight: number }
  | { readonly kind: "removeSigner"; readonly publicKey: string }
  | { readonly kind: "setThresholds"; readonly thresholds: Partial<MultisigThresholds> };

/**
 * Computes the RESULTING `MultisigAccountConfig` after applying one proposed change, without
 * submitting anything on-chain. This is the single source of truth for "what would this account's
 * config look like after this change" — callers (see `SignerManagementScreen`) run the result
 * through `wouldRiskPermanentLockout`/`wouldFreezeAccountConfig` before allowing submission, and
 * must NOT reimplement this computation inline: it used to live as inline JSX logic in
 * `SignerManagementScreen` and had a real, shipped bug there — appending rather than replacing an
 * existing signer's entry when its weight was "edited" by re-adding the same key with a new
 * weight, which silently undercounted the resulting total weight and bypassed the lockout check
 * entirely. Keeping this here, pure and tested, is what prevents that class of bug from
 * recurring.
 *
 * - `addOrUpdateSigner` mirrors Stellar's own `setOptions` signer semantics: a signer operation
 *   for a key that's already a signer REPLACES that signer's entry (weight included) rather than
 *   adding a second one — so any existing entry for `publicKey` is removed before the new one is
 *   added.
 * - `removeSigner` drops the signer entirely, matching how Horizon represents a weight-0 signer
 *   (it simply isn't listed in the signers array) rather than keeping a zero-weight entry around.
 * - `setThresholds` merges only the provided fields onto the current thresholds, leaving
 *   unspecified fields unchanged — matching `ThresholdChange`'s optional-fields shape.
 */
export function applySignerConfigChange(
  config: MultisigAccountConfig,
  change: SignerConfigChange
): MultisigAccountConfig {
  switch (change.kind) {
    case "addOrUpdateSigner":
      return {
        ...config,
        signers: [
          ...config.signers.filter((signer) => signer.publicKey !== change.publicKey),
          { publicKey: change.publicKey, weight: change.weight },
        ],
      };
    case "removeSigner":
      return {
        ...config,
        signers: config.signers.filter((signer) => signer.publicKey !== change.publicKey),
      };
    case "setThresholds":
      return {
        ...config,
        thresholds: { ...config.thresholds, ...change.thresholds },
      };
  }
}

/**
 * Applies a sequence of changes in order, each computed against the result of the previous one —
 * used when a single submission combines multiple changes (e.g. adding a signer and raising
 * thresholds together, so an account never sits in an intermediate, under-thresholded state
 * between two separate submissions).
 */
export function applySignerConfigChanges(
  config: MultisigAccountConfig,
  changes: readonly SignerConfigChange[]
): MultisigAccountConfig {
  return changes.reduce(applySignerConfigChange, config);
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
