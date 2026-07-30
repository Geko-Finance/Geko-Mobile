import {
  canAutoCompleteMint,
  getCctpChain,
  nextStep,
  type CctpChainId,
  type CctpTransfer,
  type CctpTransferDirection,
} from "@/src/domain/cctp";
import type { WalletSigner } from "@/src/domain/wallet";
import {
  CctpAttestationFailedError,
  CctpAttestationPendingError,
  depositForBurn,
  fetchCctpAttestation,
  receiveMessage,
} from "@/src/services/api/cctp";

import { useCctpTransferStore } from "../state/transfer-store";

/**
 * Orchestration for a single CCTP transfer's lifecycle, mirroring
 * features/multisig/api/propose-flow.ts's shape: plain async functions (not hooks)
 * that do one step and write the result straight into the zustand store via
 * `useCctpTransferStore.getState()`, so the store is always the source of truth an
 * app relaunch resumes from - never component state.
 *
 * Every function here is safe to call again after a crash/kill: each checks the
 * transfer's currently persisted step (domain/cctp/transfer.ts#nextStep) before
 * doing any on-chain work, so retrying never re-burns or re-mints (see
 * resumeCctpTransfer, the single entry point both explicit "Retry" taps and
 * app-launch resume should use).
 */

export class CctpFlowError extends Error {
  constructor(
    message: string,
    readonly code: "WRONG_STEP" | "CANNOT_AUTO_MINT" | "NEEDS_BURN_VERIFICATION"
  ) {
    super(message);
    this.name = "CctpFlowError";
  }
}

function requireTransfer(id: string): CctpTransfer {
  const transfer = useCctpTransferStore.getState().transfers.find((entry) => entry.id === id);

  if (transfer === undefined) {
    throw new Error(`Unknown CCTP transfer: ${id}`);
  }

  return transfer;
}

export interface StartTransferInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly direction: CctpTransferDirection;
  readonly sourceChainId: CctpChainId;
  readonly destinationChainId: CctpChainId;
  readonly stellarPublicKey: string;
  readonly recipientAddress: string;
  readonly amount: string;
}

/** Records a new transfer as `initiated`. Callers immediately follow with `runBurnStep` (stellar_to_remote) or `recordExternalBurn` (remote_to_stellar). */
function createTransfer(input: StartTransferInput): CctpTransfer {
  const now = new Date().toISOString();
  const transfer: CctpTransfer = {
    id: input.id,
    ownerUserId: input.ownerUserId,
    direction: input.direction,
    sourceChainId: input.sourceChainId,
    destinationChainId: input.destinationChainId,
    stellarPublicKey: input.stellarPublicKey,
    recipientAddress: input.recipientAddress,
    amount: input.amount,
    status: "initiated",
    createdAt: now,
    updatedAt: now,
  };

  useCctpTransferStore.getState().upsertTransfer(transfer);

  return transfer;
}

export interface RunBurnStepInput {
  readonly transferId: string;
  readonly amountUnits: bigint;
  /** 0x-prefixed bytes32 encoding of the destination recipient (see stellar-cctp-contract.ts helpers for the remote_to_stellar/CctpForwarder case). */
  readonly mintRecipientHex: string;
  readonly signer: WalletSigner;
}

/** Starts (or resumes into) the `stellar_to_remote` burn: signs and submits `deposit_for_burn` on Stellar. */
export async function runBurnStep(input: RunBurnStepInput): Promise<CctpTransfer> {
  const transfer = requireTransfer(input.transferId);
  const store = useCctpTransferStore.getState();

  if (nextStep(transfer) !== "burn") {
    throw new CctpFlowError(
      `Transfer ${transfer.id} is not awaiting a burn (next step: ${nextStep(transfer)})`,
      "WRONG_STEP"
    );
  }

  store.advance(transfer.id, "burning");

  try {
    const { burnTxHash } = await depositForBurn({
      amount: input.amountUnits,
      destinationDomainId: getCctpChain(transfer.destinationChainId).domainId,
      mintRecipientHex: input.mintRecipientHex,
      sourcePublicKey: transfer.stellarPublicKey,
      signer: input.signer,
    });

    store.advance(transfer.id, "burned", { burnTxHash });
  } catch (error) {
    store.markFailed(transfer.id, "burn", messageOf(error));
    throw error;
  }

  return requireTransfer(transfer.id);
}

/** Records a `remote_to_stellar` transfer whose burn already happened elsewhere (another wallet, on the remote chain) - the user supplies the source tx hash. */
export function recordExternalBurn(
  input: StartTransferInput & { readonly burnTxHash: string }
): CctpTransfer {
  createTransfer(input);
  const store = useCctpTransferStore.getState();

  store.advance(input.id, "burning");
  store.advance(input.id, "burned", { burnTxHash: input.burnTxHash });

  return requireTransfer(input.id);
}

/** Starts a fresh `stellar_to_remote` transfer record (status `initiated`); call `runBurnStep` next. */
export function startOutboundTransfer(input: StartTransferInput): CctpTransfer {
  return createTransfer(input);
}

/**
 * Fetches the attestation for a burned transfer's message. Idempotent: while Circle
 * is still confirming/attesting this simply leaves the transfer at `attesting` for
 * the next poll (see features/cctp/api/cctp-queries.ts's `useCctpAttestationPolling`),
 * rather than treating "not ready yet" as a failure.
 */
export async function pollAttestationStep(transferId: string): Promise<CctpTransfer> {
  const transfer = requireTransfer(transferId);
  const store = useCctpTransferStore.getState();
  const step = nextStep(transfer);

  if (step !== "attestation") {
    return transfer;
  }

  if (transfer.status === "burned") {
    store.advance(transferId, "attesting");
  }

  if (transfer.burnTxHash === undefined) {
    throw new Error(`Transfer ${transferId} has no burn tx hash to attest`);
  }

  try {
    const { messageBytes, attestation } = await fetchCctpAttestation(
      getCctpChain(transfer.sourceChainId).domainId,
      transfer.burnTxHash
    );

    store.advance(transferId, "attested", { messageBytes, attestation });
  } catch (error) {
    if (error instanceof CctpAttestationPendingError) {
      return requireTransfer(transferId);
    }

    if (error instanceof CctpAttestationFailedError) {
      store.markFailed(transferId, "attestation", messageOf(error));
    }

    throw error;
  }

  return requireTransfer(transferId);
}

export interface CompleteMintStepInput {
  readonly transferId: string;
  readonly signer: WalletSigner;
}

/** Signs and submits `receive_message` on Stellar. Only ever valid for `remote_to_stellar` transfers - see CctpTransfer's direction doc. */
export async function completeMintStep(input: CompleteMintStepInput): Promise<CctpTransfer> {
  const transfer = requireTransfer(input.transferId);

  if (!canAutoCompleteMint(transfer.direction)) {
    throw new CctpFlowError(
      "This transfer's mint happens on a remote chain and can't be completed from this wallet",
      "CANNOT_AUTO_MINT"
    );
  }

  const store = useCctpTransferStore.getState();

  if (nextStep(transfer) !== "mint") {
    throw new CctpFlowError(
      `Transfer ${transfer.id} is not awaiting a mint (next step: ${nextStep(transfer)})`,
      "WRONG_STEP"
    );
  }

  if (transfer.messageBytes === undefined || transfer.attestation === undefined) {
    throw new Error(`Transfer ${transfer.id} is missing its message/attestation`);
  }

  store.advance(transfer.id, "minting");

  try {
    const { mintTxHash } = await receiveMessage({
      messageBytesHex: transfer.messageBytes,
      attestationHex: transfer.attestation,
      sourcePublicKey: transfer.stellarPublicKey,
      signer: input.signer,
    });

    store.advance(transfer.id, "minted", { mintTxHash });
  } catch (error) {
    store.markFailed(transfer.id, "mint", messageOf(error));
    throw error;
  }

  return requireTransfer(transfer.id);
}

export interface ResumeCctpTransferOptions {
  readonly signer: WalletSigner;
  /**
   * Required only to (re)start a burn that hasn't been attempted yet (`nextStep`
   * returns `"burn"`) - the amount and mint-recipient encoding a fresh
   * `deposit_for_burn` needs. Omit when resuming a transfer that's already past its
   * burn step; passing it then is simply ignored.
   */
  readonly freshBurn?: { amountUnits: bigint; mintRecipientHex: string };
}

/**
 * Single resume/retry entry point: inspects what's already persisted on the transfer
 * and (re)runs exactly the next step - never more than one step per call - so callers
 * (an app-launch resume sweep, or a user tapping "Retry") can drive a transfer to
 * completion by calling this repeatedly without needing to know its current status
 * themselves.
 *
 * Deliberately does NOT auto-resubmit a burn left at `"verify_burn"` (interrupted
 * mid-submission, outcome unknown) - see domain/cctp/transfer.ts#nextStep's doc for
 * why that would risk a double burn. Callers must resolve that case explicitly
 * (check Horizon for a recent `deposit_for_burn` from this account, or ask the user)
 * before calling `runBurnStep` themselves.
 */
export async function resumeCctpTransfer(
  transferId: string,
  options: ResumeCctpTransferOptions
): Promise<CctpTransfer> {
  const transfer = requireTransfer(transferId);
  const step = nextStep(transfer);

  if (step === "done") {
    return transfer;
  }

  if (step === "verify_burn") {
    throw new CctpFlowError(
      `Transfer ${transferId} was interrupted mid-burn; its outcome must be verified before retrying`,
      "NEEDS_BURN_VERIFICATION"
    );
  }

  if (step === "burn") {
    if (options.freshBurn === undefined) {
      throw new Error(`Transfer ${transferId} needs an amount and mint-recipient encoding to burn`);
    }

    return runBurnStep({
      transferId,
      amountUnits: options.freshBurn.amountUnits,
      mintRecipientHex: options.freshBurn.mintRecipientHex,
      signer: options.signer,
    });
  }

  if (step === "attestation") {
    return pollAttestationStep(transferId);
  }

  return completeMintStep({ transferId, signer: options.signer });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
