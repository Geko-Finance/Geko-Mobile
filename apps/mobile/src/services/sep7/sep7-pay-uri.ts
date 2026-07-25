import type { Asset, AssetType } from "@/src/domain/wallet";
import { makeAssetId } from "@/src/domain/wallet";
import type { Sep7MemoType, Sep7PaymentRequest } from "@/src/domain/payments";

import { Sep7ParseError, isSep7Uri } from "./sep7-uri";

/**
 * SEP-7 `web+stellar:pay?...` URI encode/decode - a sibling, additive module to `sep7-uri.ts`
 * (which handles the `tx` operation only). Kept separate on purpose: `sep7-uri.ts`'s
 * `parseSep7Uri`/`Sep7TxRequest` are relied on by the multisig epic's deep-link handling and
 * its own test suite asserts `pay` is rejected *by that function specifically* - that stays
 * true forever, since `pay` parsing lives here instead. See `getSep7Operation` in
 * `sep7-uri.ts` for routing a scanned/opened URI to the right parser.
 */

const SEP7_SCHEME = "web+stellar:";
const SEP7_PAY_OPERATION = "pay";

/** Stellar protocol rule: codes of 1-4 characters are alphanum4, 5-12 are alphanum12. */
function inferAssetType(code: string): AssetType {
  return code.length <= 4 ? "credit_alphanum4" : "credit_alphanum12";
}

/** Builds a `web+stellar:pay?...` URI requesting a payment, optionally pinning amount/asset/memo. */
export function buildSep7PayUri(params: {
  destination: string;
  amount?: string;
  asset?: { code: string; issuer: string };
  memo?: string;
  memoType?: Sep7MemoType;
  msg?: string;
  networkPassphrase?: string;
}): string {
  const query = new URLSearchParams();
  query.set("destination", params.destination);

  if (params.amount !== undefined) {
    query.set("amount", params.amount);
  }

  if (params.asset !== undefined) {
    query.set("asset_code", params.asset.code);
    query.set("asset_issuer", params.asset.issuer);
  }

  if (params.memo !== undefined) {
    query.set("memo", params.memo);
  }

  if (params.memoType !== undefined) {
    query.set("memo_type", params.memoType);
  }

  if (params.msg !== undefined) {
    query.set("msg", params.msg);
  }

  if (params.networkPassphrase !== undefined) {
    query.set("network_passphrase", params.networkPassphrase);
  }

  return `${SEP7_SCHEME}${SEP7_PAY_OPERATION}?${query.toString()}`;
}

/** Parses a `web+stellar:pay?...` URI. Throws `Sep7ParseError` on anything malformed or unsupported. */
export function parseSep7PayUri(uri: string): Sep7PaymentRequest {
  if (!isSep7Uri(uri)) {
    throw new Sep7ParseError("Not a web+stellar: URI");
  }

  const queryIndex = uri.indexOf("?");

  if (queryIndex === -1) {
    throw new Sep7ParseError("Missing SEP-7 query parameters");
  }

  const operation = uri.slice(SEP7_SCHEME.length, queryIndex);

  if (operation !== SEP7_PAY_OPERATION) {
    throw new Sep7ParseError(`Unsupported SEP-7 operation: "${operation}"`);
  }

  const query = new URLSearchParams(uri.slice(queryIndex + 1));
  const destination = query.get("destination");

  if (destination === null || destination.length === 0) {
    throw new Sep7ParseError("Missing required destination parameter");
  }

  const assetCode = query.get("asset_code");
  const assetIssuer = query.get("asset_issuer");

  if ((assetCode === null) !== (assetIssuer === null)) {
    throw new Sep7ParseError("asset_code and asset_issuer must be provided together");
  }

  const asset: Asset | undefined =
    assetCode === null || assetIssuer === null
      ? undefined
      : {
          code: assetCode,
          id: makeAssetId(assetCode, assetIssuer),
          issuer: assetIssuer,
          type: inferAssetType(assetCode),
        };

  const memoType = query.get("memo_type");

  return {
    destination,
    amount: query.get("amount") ?? undefined,
    asset,
    memo: query.get("memo") ?? undefined,
    memoType: isSep7MemoType(memoType) ? memoType : undefined,
    msg: query.get("msg") ?? undefined,
    networkPassphrase: query.get("network_passphrase") ?? undefined,
    originDomain: query.get("origin_domain") ?? undefined,
    signature: query.get("signature") ?? undefined,
    callback: query.get("callback") ?? undefined,
  };
}

function isSep7MemoType(value: string | null): value is Sep7MemoType {
  return (
    value === "MEMO_TEXT" ||
    value === "MEMO_ID" ||
    value === "MEMO_HASH" ||
    value === "MEMO_RETURN"
  );
}
