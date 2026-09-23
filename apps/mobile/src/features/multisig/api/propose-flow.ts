import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk/base";

import type {
  MultisigAccount,
  PendingProposal,
  ProposalOperationKind,
  ProposalStatus,
} from "@/src/domain/multisig";
import { matchSignatures, matchedSignerKeys } from "@/src/services/multisig/match-signatures";
import {
  isThresholdMet,
  thresholdCategoryForOperation,
} from "@/src/services/multisig/threshold-math";
import { submitSignedTransaction } from "@/src/services/api/stellar/horizon-submit";
import type { BiometricAuthorizer } from "@/src/services/wallet/biometric-authorizer";
import {
  LocalSigner,
  type WalletPinProvider,
} from "@/src/services/wallet/local-signer";

import { useProposalStore } from "../state/proposal-store";

/**
 * Shared propose -> collect -> submit orchestration, generalizing the custody-branch pattern
 * in payment-queries.ts#useSendPayment: "collect N signatures locally, submit once threshold
 * met" replaces "some signers self-submit via Cavos, some need explicit submit". Used by both
 * the payment-proposal flow and signer-management (useUpdateSigners) - there is deliberately
 * only one code path here, not a separate one per operation kind.
 *
 * No backend coordination this epic: signatures are collected purely by round-tripping the
 * envelope XDR between co-signer devices via SEP-7 QR/link sharing (see src/services/sep7).
 *
 * Broadcasting only ever happens as a direct result of an explicit user action - either
 * actively signing (proposeOperation/signProposal auto-submit when that signature is the one
 * that meets the threshold) or explicitly pressing "Submit" on an already-`ready` proposal
 * (submitProposal). Passively scanning a SEP-7 link that happens to already meet threshold
 * (recordScannedEnvelope) never auto-submits by itself - the user always sees and confirms
 * before anything broadcasts, matching the rest of the app's payment-confirmation pattern.
 */

export class MultisigFlowError extends Error {
  constructor(
    message: string,
    readonly code: "UNRECOGNIZED_OPERATION" | "THRESHOLD_NOT_MET",
  ) {
    super(message);
  }
}

export type ProposeOutcome =
  | { readonly status: "submitted"; readonly hash: string }
  | { readonly status: "collecting"; readonly proposal: PendingProposal };

/**
 * This app only ever builds/recognizes these two operation shapes itself (see
 * set-options-xdr.ts / payment-xdr.ts) - a foreign SEP-7 envelope containing anything else is
 * rejected rather than guessed at, since threshold-math's category table only covers these two
 * (see threshold-math.ts's doc comment on OPERATION_THRESHOLD_CATEGORY).
 */
export function classifyEnvelopeOperation(
  envelopeXdr: string,
  networkPassphrase: string,
): ProposalOperationKind {
  const transaction = parseTransactionEnvelope(envelopeXdr, networkPassphrase);
  const [operation, ...rest] = transaction.operations;

  if (operation === undefined || rest.length > 0) {
    throw new MultisigFlowError(
      "Only single-operation transactions are supported",
      "UNRECOGNIZED_OPERATION",
    );
  }

  if (operation.type === "payment") {
    return "payment";
  }

  if (operation.type === "setOptions") {
    return "set_options";
  }

  throw new MultisigFlowError(
    `Unrecognized operation type: "${operation.type}"`,
    "UNRECOGNIZED_OPERATION",
  );
}

/** Proposer's entry point: signs `unsignedXdr` with the account's own key, then submits or stores a proposal. */
export async function proposeOperation(params: {
  account: MultisigAccount;
  operationKind: ProposalOperationKind;
  unsignedXdr: string;
  networkPassphrase: string;
  ownerUserId: string;
  pinProvider: WalletPinProvider;
  authorizer?: BiometricAuthorizer;
}): Promise<ProposeOutcome> {
  const signer = new LocalSigner({
    authorizer: params.authorizer,
    pinProvider: params.pinProvider,
    publicKey: params.account.publicKey,
  });
  const { xdr: signedXdr } = await signer.signTransaction(params.unsignedXdr, {
    networkPassphrase: params.networkPassphrase,
  });

  return finalizeSignedEnvelope({
    account: params.account,
    operationKind: params.operationKind,
    envelopeXdr: signedXdr,
    networkPassphrase: params.networkPassphrase,
    ownerUserId: params.ownerUserId,
  });
}

/**
 * Co-signer's (or the proposer's own, from a second device) entry point: adds `signerPublicKey`'s
 * signature to an existing (possibly foreign, SEP-7-scanned) envelope, then submits or re-stores
 * the proposal with the updated envelope for the next co-signer.
 */
export async function signProposal(params: {
  account: MultisigAccount;
  envelopeXdr: string;
  operationKind: ProposalOperationKind;
  networkPassphrase: string;
  ownerUserId: string;
  signerPublicKey: string;
  pinProvider: WalletPinProvider;
  authorizer?: BiometricAuthorizer;
}): Promise<ProposeOutcome> {
  const signer = new LocalSigner({
    authorizer: params.authorizer,
    pinProvider: params.pinProvider,
    publicKey: params.signerPublicKey,
  });
  const { xdr: signedXdr } = await signer.signTransaction(params.envelopeXdr, {
    networkPassphrase: params.networkPassphrase,
  });

  return finalizeSignedEnvelope({
    account: params.account,
    operationKind: params.operationKind,
    envelopeXdr: signedXdr,
    networkPassphrase: params.networkPassphrase,
    ownerUserId: params.ownerUserId,
  });
}

/**
 * Records a scanned (or freshly opened, via the native `web+stellar:` listener) SEP-7 envelope
 * as a local proposal WITHOUT signing or submitting it - used when this device is just
 * receiving/relaying state, not actively signing right now. If the scanned envelope already
 * meets threshold (e.g. it was fully signed elsewhere), the proposal is marked `ready` for the
 * user to explicitly submit via `submitProposal` - scanning alone never broadcasts.
 */
export function recordScannedEnvelope(params: {
  account: MultisigAccount;
  envelopeXdr: string;
  operationKind: ProposalOperationKind;
  networkPassphrase: string;
  ownerUserId: string;
}): PendingProposal {
  const { transaction, category, met } = analyzeEnvelope(params);

  return buildProposalRecord({
    ...params,
    category,
    status: met ? "ready" : "collecting",
    transaction,
  });
}

/** Explicit broadcast of a proposal already at `ready` status - re-verifies threshold against the live account before submitting. */
export async function submitProposal(params: {
  account: MultisigAccount;
  proposal: PendingProposal;
}): Promise<{ hash: string }> {
  const { met } = analyzeEnvelope({
    account: params.account,
    envelopeXdr: params.proposal.envelopeXdr,
    networkPassphrase: params.proposal.networkPassphrase,
    operationKind: params.proposal.operationKind,
  });

  if (!met) {
    throw new MultisigFlowError(
      "This proposal no longer meets the account's signing threshold",
      "THRESHOLD_NOT_MET",
    );
  }

  const { hash } = await submitSignedTransaction(params.proposal.envelopeXdr);

  useProposalStore.getState().markSubmitted(params.proposal.id, hash);

  return { hash };
}

async function finalizeSignedEnvelope(params: {
  account: MultisigAccount;
  operationKind: ProposalOperationKind;
  envelopeXdr: string;
  networkPassphrase: string;
  ownerUserId: string;
}): Promise<ProposeOutcome> {
  const { transaction, category, met } = analyzeEnvelope(params);

  if (met) {
    const { hash } = await submitSignedTransaction(params.envelopeXdr);
    const proposalId = proposalIdFor(transaction);
    const existing = useProposalStore
      .getState()
      .proposals.find((proposal) => proposal.id === proposalId);

    if (existing !== undefined) {
      useProposalStore.getState().markSubmitted(proposalId, hash);
    }

    return { status: "submitted", hash };
  }

  const proposal = buildProposalRecord({
    ...params,
    category,
    status: "collecting",
    transaction,
  });

  return { status: "collecting", proposal };
}

function analyzeEnvelope(params: {
  account: MultisigAccount;
  operationKind: ProposalOperationKind;
  envelopeXdr: string;
  networkPassphrase: string;
}): {
  transaction: Transaction;
  category: ReturnType<typeof thresholdCategoryForOperation>;
  met: boolean;
} {
  const transaction = parseTransactionEnvelope(
    params.envelopeXdr,
    params.networkPassphrase,
  );
  const category = thresholdCategoryForOperation(params.operationKind);
  const signedKeys = matchedSignerKeys(transaction, params.account.signers);
  const met = isThresholdMet(
    params.account.thresholds,
    category,
    params.account.signers,
    signedKeys,
  );

  return { transaction, category, met };
}

function buildProposalRecord(params: {
  account: MultisigAccount;
  operationKind: ProposalOperationKind;
  envelopeXdr: string;
  networkPassphrase: string;
  ownerUserId: string;
  transaction: Transaction;
  category: ReturnType<typeof thresholdCategoryForOperation>;
  status: ProposalStatus;
}): PendingProposal {
  const now = new Date().toISOString();
  const proposalId = proposalIdFor(params.transaction);
  const existing = useProposalStore
    .getState()
    .proposals.find((proposal) => proposal.id === proposalId);
  const proposal: PendingProposal = {
    id: proposalId,
    accountPublicKey: params.account.publicKey,
    ownerUserId: params.ownerUserId,
    operationKind: params.operationKind,
    thresholdCategory: params.category,
    envelopeXdr: params.envelopeXdr,
    networkPassphrase: params.networkPassphrase,
    signatures: matchSignatures(params.transaction, params.account.signers, now),
    status: params.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  useProposalStore.getState().upsertProposal(proposal);

  return proposal;
}

/**
 * A transaction's hash is computed from its body (source, sequence, operations, timebounds,
 * fee, memo) only - signatures never affect it. Using it as the proposal id means every
 * co-signer's copy of the same underlying transaction naturally lands on the same local
 * record, with no extra out-of-band id to invent or carry through the SEP-7 URI.
 */
function proposalIdFor(transaction: Transaction): string {
  return transaction.hash().toString("hex");
}

function parseTransactionEnvelope(
  envelopeXdr: string,
  networkPassphrase: string,
): Transaction {
  const parsed = TransactionBuilder.fromXDR(envelopeXdr, networkPassphrase);

  if (!(parsed instanceof Transaction)) {
    throw new MultisigFlowError(
      "Fee-bump envelopes are not supported for multisig proposals",
      "UNRECOGNIZED_OPERATION",
    );
  }

  return parsed;
}
