import {
  Sep7Pay,
  Sep7Tx,
  isValidSep7Uri,
  parseSep7Uri,
} from "@stellar/typescript-wallet-sdk";

import { isLikelyStellarPublicKey } from "../wallet";
import type { Sep7PayRequest, Sep7Request } from "./types";

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
    };
  }

  throw new Error("Not a valid SEP-7 URI: unsupported operation type");
}
