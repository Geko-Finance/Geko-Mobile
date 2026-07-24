import type {
  ProposalOperationKind,
  SignerEntry,
  ThresholdCategory,
  Thresholds,
} from "@/src/domain/multisig";

/**
 * Pure signer-weight/threshold arithmetic - no I/O, no Stellar SDK types. Kept isolated so it
 * is trivially unit-testable (see __tests__/threshold-math.test.ts), since getting this wrong
 * is a real security bug, not just a UI nit.
 *
 * This app only ever builds two operation kinds itself (see set-options-xdr.ts/payment-xdr.ts),
 * so the category mapping is a small explicit table rather than a general XDR-operation-type
 * classifier: native payments fall under Stellar's "medium" threshold category; a `SetOptions`
 * that changes signers, the master weight, or the thresholds themselves - the only kind of
 * `SetOptions` this app builds - falls under "high". This does NOT generalize to arbitrary
 * externally-supplied XDR (e.g. from a scanned SEP-7 link) - callers that accept foreign XDR
 * must reject operation types this table doesn't cover rather than guess a category for them.
 */
const OPERATION_THRESHOLD_CATEGORY: Record<
  ProposalOperationKind,
  ThresholdCategory
> = {
  payment: "medium",
  set_options: "high",
};

/** Threshold category for an operation kind this app builds itself. */
export function thresholdCategoryForOperation(
  operationKind: ProposalOperationKind,
): ThresholdCategory {
  return OPERATION_THRESHOLD_CATEGORY[operationKind];
}

/** Minimum combined signer weight required to authorize an operation in `category`. */
export function requiredThreshold(
  thresholds: Thresholds,
  category: ThresholdCategory,
): number {
  return thresholds[category];
}

/**
 * Sums the weight of every signer in `signers` whose key appears in `signerKeys`.
 * `signerKeys` is de-duplicated first, so a key that signed more than once (or that appears
 * more than once for any other reason) never contributes its weight more than once.
 * Keys with no matching entry in `signers` (unknown or already-removed signers) contribute 0.
 */
export function collectedWeight(
  signers: SignerEntry[],
  signerKeys: string[],
): number {
  const uniqueKeys = new Set(signerKeys);
  let total = 0;

  for (const signer of signers) {
    if (uniqueKeys.has(signer.key)) {
      total += signer.weight;
    }
  }

  return total;
}

/**
 * Whether the signatures in `signerKeys` meet or exceed `category`'s threshold, given the
 * account's current `signers`/`thresholds`. A threshold of 0 is trivially met (matches real
 * Stellar behavior: a 0 threshold means the operation requires no signature at all).
 */
export function isThresholdMet(
  thresholds: Thresholds,
  category: ThresholdCategory,
  signers: SignerEntry[],
  signerKeys: string[],
): boolean {
  return (
    collectedWeight(signers, signerKeys) >=
    requiredThreshold(thresholds, category)
  );
}

/**
 * How much more combined weight is needed to meet `category`'s threshold, floored at 0.
 * Useful for UI copy like "needs 2 more weight". Does not indicate whether that weight is
 * even reachable with the account's current signers - see `isThresholdReachable`.
 */
export function remainingWeight(
  thresholds: Thresholds,
  category: ThresholdCategory,
  signers: SignerEntry[],
  signerKeys: string[],
): number {
  const remaining =
    requiredThreshold(thresholds, category) -
    collectedWeight(signers, signerKeys);

  return Math.max(0, remaining);
}

/**
 * Whether `category`'s threshold can ever be met by this account's current signers at all
 * (sum of every signer's weight, regardless of who has actually signed so far). False means
 * the account is misconfigured for this operation category - e.g. all signers together don't
 * have enough combined weight - and no amount of additional signing will help.
 */
export function isThresholdReachable(
  thresholds: Thresholds,
  category: ThresholdCategory,
  signers: SignerEntry[],
): boolean {
  const totalWeight = signers.reduce((sum, signer) => sum + signer.weight, 0);

  return totalWeight >= requiredThreshold(thresholds, category);
}
