// src/domain/multisig/types.ts

/** A Stellar account signer (any signer, including the master key — its `publicKey` equals the account's own address). */
export interface MultisigSigner {
  readonly publicKey: string;
  readonly weight: number;
}

/** Threshold weights required for low/medium/high-category operations. */
export interface MultisigThresholds {
  readonly low: number;
  readonly medium: number;
  readonly high: number;
}

/** An account's on-chain multisig configuration: its full signer list (master key included) and thresholds. */
export interface MultisigAccountConfig {
  readonly signers: MultisigSigner[];
  readonly thresholds: MultisigThresholds;
}

/**
 * A transaction proposed for multisig signing, tracked locally until it has enough
 * signatures to submit. `id` is stable across signature additions (see `pendingTxIdForXdr`) —
 * `envelopeXdr` is NOT part of the id, since it changes every time a signature is added.
 */
export interface PendingTx {
  readonly id: string;
  readonly sourceAccountId: string;
  readonly envelopeXdr: string;
  readonly networkPassphrase: string;
  readonly createdAt: string;
  readonly description?: string;
}

export type ThresholdCategory = "low" | "medium" | "high";

export interface ThresholdEvaluation {
  readonly requiredWeight: number;
  readonly collectedWeight: number;
  readonly isSatisfied: boolean;
  readonly signedBy: string[];
}
