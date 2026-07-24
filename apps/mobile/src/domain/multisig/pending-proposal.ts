import type { ThresholdCategory } from "./thresholds";

/**
 * Kind of operation a locally-built proposal carries. Deliberately narrow: this app only
 * ever builds these two operation kinds itself (see set-options-xdr.ts/payment-xdr.ts), so
 * `thresholdCategory` can be assigned from a small explicit table (see threshold-math.ts)
 * instead of parsing arbitrary XDR operation types.
 */
export type ProposalOperationKind = "payment" | "set_options";

export type ProposalStatus =
  | "collecting"
  | "ready"
  | "submitted"
  | "expired"
  | "rejected";

/**
 * A signature already present on a proposal's envelope, resolved against the account's known
 * signers (see src/services/multisig/match-signatures.ts) purely for display - the envelope
 * XDR itself remains the single source of truth for which signatures actually exist.
 */
export interface ProposalSignature {
  readonly signerKey: string;
  readonly signedAt: string;
}

/**
 * A transaction proposed against a multisig account, tracked locally on this device only
 * (no backend coordination this epic - see docs/superpowers/specs or the epic ticket).
 * `envelopeXdr` accumulates signatures as it round-trips through co-signer devices via
 * SEP-7 QR/link sharing; it is the only source of truth for "who has signed so far".
 * `ownerUserId` mirrors WalletAccount's session-scoping: this store persists across
 * sign-outs, so every read path must filter by it.
 */
export interface PendingProposal {
  readonly id: string;
  readonly accountPublicKey: string;
  readonly ownerUserId: string;
  readonly operationKind: ProposalOperationKind;
  readonly thresholdCategory: ThresholdCategory;
  readonly envelopeXdr: string;
  readonly networkPassphrase: string;
  readonly signatures: ProposalSignature[];
  readonly status: ProposalStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedHash?: string;
}
