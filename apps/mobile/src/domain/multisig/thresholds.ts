/**
 * An account's signing thresholds, mirroring Stellar's native `SetOptions`/account model.
 * `masterWeight` is the weight of the account's own master key (0 means the master key is
 * disabled and can no longer sign at all - only the extra signers can).
 * `low`/`medium`/`high` are the minimum combined signer weight required to authorize an
 * operation in that threshold category (see `ThresholdCategory`).
 */
export interface Thresholds {
  readonly masterWeight: number;
  readonly low: number;
  readonly medium: number;
  readonly high: number;
}

/**
 * Stellar groups every operation type into one of three threshold categories.
 * This epic only ever builds/proposes `payment` (medium) and `set_options` (high, when it
 * changes signers/thresholds/master weight) operations - see
 * src/services/multisig/threshold-math.ts for the category assignment.
 */
export type ThresholdCategory = "low" | "medium" | "high";
