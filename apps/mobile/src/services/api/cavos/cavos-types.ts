/** Social or email login identity passed to Cavos connect (no PII beyond what is required). */
export interface CavosIdentity {
  readonly email?: string;
  readonly userId: string;
}

/** Cavos SDK wallet status; extend as additional SDK values are adopted. */
export type CavosWalletStatus = "ready" | "needs-device-approval";

/**
 * Safe Cavos session snapshot — no tokens or signing secrets.
 * This is the only Cavos session shape that may be persisted.
 */
export interface CavosSession {
  readonly address: string;
  readonly status: CavosWalletStatus;
  readonly userId: string;
}

/** Result of Cavos wallet.execute(): on-chain transaction hash only. */
export interface CavosExecuteResult {
  readonly hash: string;
}
