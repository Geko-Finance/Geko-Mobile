import {
  Sep7Pay,
  Sep7Tx,
  isValidSep7Uri,
  parseSep7Uri,
} from "@stellar/typescript-wallet-sdk";
import type { Networks } from "@stellar/stellar-sdk";

import { isLikelyStellarPublicKey } from "../wallet";
import type { Sep7PayRequest, Sep7Request, Sep7TxRequest } from "./types";

function assertValidDestination(destination: string): void {
  if (!isLikelyStellarPublicKey(destination)) {
    throw new Error(
      "SEP-7 pay request destination is not a syntactically valid Stellar address"
    );
  }
}

function assertValidAssetPair(
  assetCode: string | undefined,
  assetIssuer: string | undefined
): void {
  if (assetCode !== undefined && assetIssuer === undefined) {
    throw new Error(
      "SEP-7 pay request has asset_code but is missing asset_issuer"
    );
  }
}

/**
 * Text-equivalent `memo_type` values we accept: the raw SEP-7 spec form (`MEMO_TEXT`, as used
 * in real-world URIs) and the wallet-sdk's own lowercase `MemoType` union form (`text`, as
 * `Sep7Pay.memoType`'s getter is a raw, unvalidated passthrough of the URI's `memo_type` query
 * param — it does not normalize or restrict it to the SDK's own `MemoType` values). Compared
 * case-insensitively so either casing is accepted.
 */
const TEXT_MEMO_TYPE_VALUES = new Set(["text", "memo_text"]);

/**
 * Rejects any scanned `memo_type` other than MEMO_TEXT (or an absent `memo_type`, which per the
 * SEP-7 spec defaults to MEMO_TEXT when `memo` is present). We only support MEMO_TEXT today —
 * `LocalWalletSigner`/`ConfirmPaymentScreen` only ever construct a text memo — so an
 * `MEMO_ID`/`MEMO_HASH`/`MEMO_RETURN` request must fail loudly here rather than have its memo
 * silently re-typed as text on submission (e.g. a numeric `MEMO_ID` deposit-routing code sent as
 * MEMO_TEXT reaches the chain fine but the receiving exchange won't credit it — silent,
 * unrecoverable fund loss). Real multi-type support is a follow-up task.
 */
function assertValidMemoType(memoType: string | undefined): void {
  if (memoType === undefined) {
    return;
  }

  if (!TEXT_MEMO_TYPE_VALUES.has(memoType.toLowerCase())) {
    throw new Error(
      `SEP-7 pay request memo type "${memoType}" is not supported yet (only MEMO_TEXT); ` +
        "sending it would silently misrepresent the memo on-chain"
    );
  }
}

/** Encodes a payment request as a `web+stellar:pay` SEP-7 URI. */
export function encodeSep7PayRequest(request: Sep7PayRequest): string {
  assertValidDestination(request.destination);
  assertValidAssetPair(request.assetCode, request.assetIssuer);

  const sep7Pay = Sep7Pay.forDestination(request.destination);
  sep7Pay.amount = request.amount;
  sep7Pay.assetCode = request.assetCode;
  sep7Pay.assetIssuer = request.assetIssuer;
  sep7Pay.memo = request.memo;
  sep7Pay.msg = request.message;

  return sep7Pay.toString();
}

/** Encodes a request to sign a specific transaction envelope as a `web+stellar:tx` SEP-7 URI. */
export function encodeSep7TxRequest(request: Sep7TxRequest): string {
  const sep7Tx = new Sep7Tx();
  sep7Tx.xdr = request.xdr;
  sep7Tx.networkPassphrase = request.networkPassphrase as Networks;
  sep7Tx.pubkey = request.pubkey;
  sep7Tx.msg = request.message;

  return sep7Tx.toString();
}

/** Decodes any SEP-7 URI (`web+stellar:pay` or `web+stellar:tx`) into a plain domain request. */
export function decodeSep7Uri(uri: string): Sep7Request {
  if (!isValidSep7Uri(uri).result) {
    throw new Error("Not a valid SEP-7 URI");
  }

  const parsed = parseSep7Uri(uri);

  if (parsed instanceof Sep7Pay) {
    if (parsed.destination === undefined) {
      throw new Error("Not a valid SEP-7 URI: pay request has no destination");
    }

    assertValidAssetPair(parsed.assetCode, parsed.assetIssuer);
    assertValidMemoType(parsed.memoType);

    return {
      kind: "pay",
      destination: parsed.destination,
      amount: parsed.amount,
      assetCode: parsed.assetCode,
      assetIssuer: parsed.assetIssuer,
      memo: parsed.memo,
      message: parsed.msg,
    };
  }

  if (parsed instanceof Sep7Tx) {
    if (parsed.xdr === undefined) {
      throw new Error("Not a valid SEP-7 URI: tx request has no xdr");
    }

    return {
      kind: "tx",
      xdr: parsed.xdr,
      networkPassphrase: parsed.networkPassphrase,
      message: parsed.msg,
      pubkey: parsed.pubkey,
    };
  }

  throw new Error("Not a valid SEP-7 URI: unsupported operation type");
}
