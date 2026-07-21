// src/domain/multisig/transaction-summary.ts
import type { Operation } from "@stellar/stellar-base";

import { decodeAsTransaction } from "./threshold";

/** A human-decodable summary of a `payment` operation — enough to show a co-signer what it does before they sign or submit it. */
export interface PaymentOperationSummary {
  readonly type: "payment";
  readonly destination: string;
  readonly amount: string;
  readonly assetCode: string;
  /** `undefined` for the native XLM asset. */
  readonly assetIssuer?: string;
}

/**
 * A human-decodable summary of a `setOptions` operation. A single `setOptions` operation can
 * change several things at once (this app's own `buildSignerConfigTransaction` can combine signer
 * changes, threshold changes, and locking the master key into one operation) — every field here is
 * independently optional, matching which sub-changes are actually present on the decoded
 * operation. `undefined` means "this operation does not touch that field", not "set to nothing".
 */
export interface SetOptionsOperationSummary {
  readonly type: "setOptions";
  /** Present when this operation adds a new signer or changes an existing signer's weight (weight 0 means the signer is being removed). Only decodes ed25519-public-key signers — Stellar also allows hash/pre-auth-tx/signed-payload signers, which are surfaced generically instead since they can't be shown as a familiar public key. */
  readonly signerChange?: { readonly publicKey: string; readonly weight: number };
  /** Present when this operation changes a signer that is NOT a plain ed25519 public key (a hash, pre-authorized transaction, or signed payload signer). */
  readonly hasNonKeySignerChange?: boolean;
  readonly lowThreshold?: number;
  readonly medThreshold?: number;
  readonly highThreshold?: number;
  readonly masterWeight?: number;
  readonly homeDomain?: string;
}

/** A human-decodable summary of any operation type this app doesn't have a dedicated summary for. */
export interface OtherOperationSummary {
  readonly type: "other";
  readonly operationType: string;
}

export type OperationSummary =
  | PaymentOperationSummary
  | SetOptionsOperationSummary
  | OtherOperationSummary;

function summarizePaymentOperation(operation: Operation.Payment): PaymentOperationSummary {
  return {
    type: "payment",
    destination: operation.destination,
    amount: operation.amount,
    assetCode: operation.asset.isNative() ? "XLM" : operation.asset.code,
    assetIssuer: operation.asset.isNative() ? undefined : operation.asset.issuer,
  };
}

function summarizeSetOptionsOperation(
  operation: Operation.SetOptions
): SetOptionsOperationSummary {
  const signer = operation.signer;
  const signerChange =
    signer !== undefined && "ed25519PublicKey" in signer && signer.weight !== undefined
      ? { publicKey: signer.ed25519PublicKey, weight: signer.weight }
      : undefined;
  const hasNonKeySignerChange = signer !== undefined && signerChange === undefined;

  return {
    type: "setOptions",
    signerChange,
    hasNonKeySignerChange: hasNonKeySignerChange ? true : undefined,
    lowThreshold: operation.lowThreshold,
    medThreshold: operation.medThreshold,
    highThreshold: operation.highThreshold,
    masterWeight: operation.masterWeight,
    homeDomain: operation.homeDomain,
  };
}

/**
 * Decodes an envelope XDR's operations into human-decodable summaries, so a co-signer can see
 * what a pending transaction actually does (destination/amount for a payment; what's changing for
 * a signer/threshold change) before Sign/Submit — rather than blind-signing based only on
 * collected-weight counts. Throws on a fee-bump envelope, same as `evaluatePendingTx` (see
 * `decodeAsTransaction`'s docblock for why `instanceof FeeBumpTransaction` is the only reliable
 * check).
 */
export function describeTransactionOperations(
  envelopeXdr: string,
  networkPassphrase: string
): OperationSummary[] {
  const transaction = decodeAsTransaction(envelopeXdr, networkPassphrase);

  return transaction.operations.map((operation): OperationSummary => {
    switch (operation.type) {
      case "payment":
        return summarizePaymentOperation(operation);
      case "setOptions":
        return summarizeSetOptionsOperation(operation);
      default:
        return { type: "other", operationType: operation.type };
    }
  });
}
