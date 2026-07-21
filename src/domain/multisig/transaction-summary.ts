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

/** A human-decodable summary of an `accountMerge` operation — transfers the ENTIRE source balance to `destination` and permanently deletes the source account. */
export interface AccountMergeOperationSummary {
  readonly type: "accountMerge";
  readonly destination: string;
}

/**
 * The shared shape of a `pathPaymentStrictReceive`/`pathPaymentStrictSend` summary — a payment
 * that converts between assets along a path, still moving value to `destination` just like a
 * plain `payment`. The two variants (defined as separate interfaces below, each with its own
 * singleton `type` literal, NOT a single interface with a two-value `type` union — TypeScript's
 * discriminated-union narrowing on `OperationSummary` only works per-member when each member's
 * discriminant is a single literal) bound the amount from opposite ends:
 * - `pathPaymentStrictReceive`: `sendAmount` is the MOST the sender is willing to send;
 *   `destAmount` is the EXACT amount the destination receives.
 * - `pathPaymentStrictSend`: `sendAmount` is the EXACT amount sent; `destAmount` is the LEAST the
 *   destination must receive.
 */
interface PathPaymentOperationSummaryFields {
  readonly destination: string;
  readonly sendAssetCode: string;
  readonly sendAssetIssuer?: string;
  readonly destAssetCode: string;
  readonly destAssetIssuer?: string;
  readonly sendAmount: string;
  readonly destAmount: string;
}

export interface PathPaymentStrictReceiveOperationSummary
  extends PathPaymentOperationSummaryFields {
  readonly type: "pathPaymentStrictReceive";
}

export interface PathPaymentStrictSendOperationSummary
  extends PathPaymentOperationSummaryFields {
  readonly type: "pathPaymentStrictSend";
}

export type PathPaymentOperationSummary =
  | PathPaymentStrictReceiveOperationSummary
  | PathPaymentStrictSendOperationSummary;

/**
 * A human-decodable summary of any operation type this app doesn't have a dedicated summary for
 * (e.g. `changeTrust`, `manageSellOffer`, `clawback`, `invokeHostFunction`). Deliberately does NOT
 * try to classify which of these are "safe" — the UI renders a uniform, prominent caution for
 * every one of these, since this list can't be assumed exhaustive and several of them (trustline,
 * offer, and smart-contract-invocation operations) can move or lock up value just as much as a
 * payment can.
 */
export interface OtherOperationSummary {
  readonly type: "other";
  readonly operationType: string;
}

export type OperationSummary =
  | PaymentOperationSummary
  | SetOptionsOperationSummary
  | AccountMergeOperationSummary
  | PathPaymentOperationSummary
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

function summarizeAccountMergeOperation(
  operation: Operation.AccountMerge
): AccountMergeOperationSummary {
  return { type: "accountMerge", destination: operation.destination };
}

function summarizePathPaymentOperation(
  operation: Operation.PathPaymentStrictReceive | Operation.PathPaymentStrictSend
): PathPaymentOperationSummary {
  const sendAssetCode = operation.sendAsset.isNative() ? "XLM" : operation.sendAsset.code;
  const sendAssetIssuer = operation.sendAsset.isNative() ? undefined : operation.sendAsset.issuer;
  const destAssetCode = operation.destAsset.isNative() ? "XLM" : operation.destAsset.code;
  const destAssetIssuer = operation.destAsset.isNative() ? undefined : operation.destAsset.issuer;

  if (operation.type === "pathPaymentStrictSend") {
    return {
      type: "pathPaymentStrictSend",
      destination: operation.destination,
      sendAssetCode,
      sendAssetIssuer,
      destAssetCode,
      destAssetIssuer,
      // Exact amount sent; destMin is the least the destination is guaranteed to receive.
      sendAmount: operation.sendAmount,
      destAmount: operation.destMin,
    };
  }

  return {
    type: "pathPaymentStrictReceive",
    destination: operation.destination,
    sendAssetCode,
    sendAssetIssuer,
    destAssetCode,
    destAssetIssuer,
    // sendMax is the most the sender is willing to send; destAmount is the exact amount received.
    sendAmount: operation.sendMax,
    destAmount: operation.destAmount,
  };
}

/**
 * Decodes an envelope XDR's operations into human-decodable summaries, so a co-signer can see
 * what a pending transaction actually does (destination/amount for a payment or path payment;
 * destination for an account merge, which transfers the ENTIRE balance and deletes the account;
 * what's changing for a signer/threshold change) before Sign/Submit — rather than blind-signing
 * based only on collected-weight counts. Throws on a fee-bump envelope, same as
 * `evaluatePendingTx` (see `decodeAsTransaction`'s docblock for why `instanceof
 * FeeBumpTransaction` is the only reliable check).
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
      case "accountMerge":
        return summarizeAccountMergeOperation(operation);
      case "pathPaymentStrictReceive":
      case "pathPaymentStrictSend":
        return summarizePathPaymentOperation(operation);
      default:
        return { type: "other", operationType: operation.type };
    }
  });
}
