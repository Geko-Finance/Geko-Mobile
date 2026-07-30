import type { CctpChainId } from "./chain";

/**
 * `stellar_to_remote`: this wallet burns native USDC on Stellar (Soroban
 * `deposit_for_burn`, which this app's `WalletSigner` can sign) for a recipient on a
 * remote CCTP chain. Minting on the remote chain needs a signer on that chain, which
 * this Stellar-only wallet does not hold - the transfer is tracked through `attested`
 * and the raw message/attestation are surfaced so the user can complete the mint with
 * a wallet on the destination chain (or a relayer). See CctpTransfer.mintTxHash doc.
 *
 * `remote_to_stellar`: USDC was already burned on a remote chain (by this user, in
 * another wallet); this wallet completes the transfer end-to-end by fetching the
 * attestation and minting into a Stellar account via Soroban `receive_message`, which
 * this app's `WalletSigner` can sign. This is the only direction this app can drive
 * fully autonomously, since every step that requires a signature happens on Stellar.
 */
export type CctpTransferDirection = "stellar_to_remote" | "remote_to_stellar";

/**
 * initiated -> burning -> burned -> attesting -> attested -> minting -> minted.
 * `failed` is reachable from any in-flight (non-`minted`) state and always carries
 * `failedStep` + `failureReason`; retrying re-enters exactly the step that failed
 * (see `nextStep` / retry orchestration in features/cctp/api/cctp-flow.ts) and never
 * re-executes a step whose hash/attestation is already persisted on the record - that
 * persisted fact is what makes retries funds-safe (see `canTransition`).
 */
export type CctpTransferStatus =
  | "initiated"
  | "burning"
  | "burned"
  | "attesting"
  | "attested"
  | "minting"
  | "minted"
  | "failed";

export type CctpTransferStep = "burn" | "attestation" | "mint";

/**
 * A single Stellar <-> remote-chain CCTP transfer, tracked locally on this device
 * (no backend coordination - mirrors PendingProposal's local-only model). Every
 * on-chain fact this record accumulates (`burnTxHash`, `messageBytes`, `attestation`,
 * `mintTxHash`) is append-only and never cleared by a retry; only `status`,
 * `failedStep`, `failureReason`, and `updatedAt` change on failure/retry.
 * `ownerUserId` mirrors WalletAccount/PendingProposal's session-scoping: this record
 * persists across sign-outs, so every read path must filter by it.
 */
export interface CctpTransfer {
  readonly id: string;
  readonly ownerUserId: string;
  readonly direction: CctpTransferDirection;
  readonly sourceChainId: CctpChainId;
  readonly destinationChainId: CctpChainId;
  /** Stellar G... address this device signs with for the Stellar-side step (burn when outbound, mint when inbound). */
  readonly stellarPublicKey: string;
  /** Final recipient address on the destination chain (G... for `remote_to_stellar`, a foreign-chain address for `stellar_to_remote`). */
  readonly recipientAddress: string;
  /** USDC amount as a decimal string in the *source* chain's native precision (see amount.ts for cross-chain conversion). */
  readonly amount: string;
  readonly status: CctpTransferStatus;
  /** Source-chain burn transaction hash; present once `burning` completes. */
  readonly burnTxHash?: string;
  /** Hex-encoded CCTP message bytes, present once the burn is observed by Circle. */
  readonly messageBytes?: string;
  /** Hex-encoded attestation signature, present once Circle finishes attesting. */
  readonly attestation?: string;
  /** Destination-chain mint transaction hash; present once `minting` completes. Only ever set by this app for `remote_to_stellar` transfers - see the direction doc above. */
  readonly mintTxHash?: string;
  readonly failedStep?: CctpTransferStep;
  readonly failureReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const TERMINAL_STATUSES: ReadonlySet<CctpTransferStatus> = new Set(["minted", "failed"]);

export function isTerminalStatus(status: CctpTransferStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Whether this transfer is mid-flight and can be resumed after an app restart. */
export function isResumable(transfer: CctpTransfer): boolean {
  return !isTerminalStatus(transfer.status) || transfer.status === "failed";
}

const VALID_TRANSITIONS: Record<CctpTransferStatus, readonly CctpTransferStatus[]> = {
  initiated: ["burning", "failed"],
  burning: ["burned", "failed"],
  burned: ["attesting", "failed"],
  attesting: ["attested", "failed"],
  attested: ["minting", "failed"],
  minting: ["minted", "failed"],
  minted: [],
  // A retry re-enters the in-flight state for whatever step failed, never `initiated` -
  // the steps already persisted (burnTxHash, attestation, ...) must never be redone.
  failed: ["burning", "attesting", "minting"],
};

/** Guards every store mutation (see features/cctp/state/transfer-store.ts) against skipping or repeating a step. */
export function canTransition(from: CctpTransferStatus, to: CctpTransferStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/** Whether this app can sign the mint step itself - only true when Stellar is the destination (see the direction doc above). */
export function canAutoCompleteMint(direction: CctpTransferDirection): boolean {
  return direction === "remote_to_stellar";
}

/**
 * The step a transfer must (re)run next, given what's already persisted on it - the
 * single source of truth for resume/retry.
 *
 * `"verify_burn"` is deliberately distinct from `"burn"`: unlike minting (CCTP's
 * MessageTransmitter rejects a replayed message on-chain, so re-submitting a mint is
 * protocol-safe - see receiveMessage's doc comment), a burn has no on-chain
 * idempotency guard. If the app is killed after `deposit_for_burn` is submitted but
 * before `burnTxHash` is persisted (status stuck at `"burning"`), we cannot tell
 * "never actually sent" from "sent, just not recorded" - blindly resubmitting could
 * burn the user's USDC twice. Callers (see features/cctp/api/cctp-flow.ts's
 * `resumeCctpTransfer`) must surface `"verify_burn"` as "check what happened before
 * retrying" rather than auto-resubmitting.
 */
export function nextStep(transfer: CctpTransfer): CctpTransferStep | "done" | "verify_burn" {
  if (transfer.status === "minted") {
    return "done";
  }

  if (transfer.mintTxHash !== undefined) {
    return "done";
  }

  if (transfer.attestation !== undefined) {
    return "mint";
  }

  if (transfer.burnTxHash !== undefined) {
    return "attestation";
  }

  if (transfer.status === "burning") {
    return "verify_burn";
  }

  return "burn";
}
