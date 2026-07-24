/**
 * SEP-7 `web+stellar:` URI encode/decode for sharing a transaction envelope with co-signers.
 * See https://developers.stellar.org/docs/build/apps/wallet/sep7
 *
 * Only the `tx` operation is supported (this app never builds `pay` request URIs). Parsing
 * uses manual string splitting + `URLSearchParams` for the query portion rather than the
 * global `URL` class, since `web+stellar:` is a non-hierarchical custom scheme (no `//`) and
 * `URL`'s handling of custom schemes varies across polyfills/platforms - `URLSearchParams` on
 * its own only ever sees a plain query string, so it has no scheme-parsing behavior to vary.
 *
 * SEP-7's origin-domain signature verification (the spec's anti-phishing mechanism, checking
 * `signature` against `origin_domain`'s stellar.toml) is deliberately NOT implemented here -
 * a known, deliberate scope cut for this epic (local/link-based sharing between co-signers
 * you already trust), not an oversight. `originDomain`/`signature` are parsed through for
 * display only.
 */

const SEP7_SCHEME = "web+stellar:";
const SEP7_TX_OPERATION = "tx";

export class Sep7ParseError extends Error {}

/** A parsed SEP-7 `tx` request. Only `xdr` is guaranteed present; everything else is optional per spec. */
export interface Sep7TxRequest {
  readonly xdr: string;
  readonly callback?: string;
  readonly pubkey?: string;
  readonly msg?: string;
  readonly networkPassphrase?: string;
  readonly originDomain?: string;
  readonly signature?: string;
}

/** Whether `value` looks like a SEP-7 URI (any operation), cheap check before attempting to parse. */
export function isSep7Uri(value: string): boolean {
  return value.startsWith(SEP7_SCHEME);
}

/** Builds a `web+stellar:tx?...` URI carrying a (possibly partially-signed) transaction envelope. */
export function buildSep7TxUri(params: {
  xdr: string;
  msg?: string;
  networkPassphrase: string;
}): string {
  const query = new URLSearchParams();
  query.set("xdr", params.xdr);
  query.set("network_passphrase", params.networkPassphrase);

  if (params.msg !== undefined) {
    query.set("msg", params.msg);
  }

  return `${SEP7_SCHEME}${SEP7_TX_OPERATION}?${query.toString()}`;
}

/** Parses a `web+stellar:tx?...` URI. Throws `Sep7ParseError` on anything malformed or unsupported. */
export function parseSep7Uri(uri: string): Sep7TxRequest {
  if (!isSep7Uri(uri)) {
    throw new Sep7ParseError("Not a web+stellar: URI");
  }

  const queryIndex = uri.indexOf("?");

  if (queryIndex === -1) {
    throw new Sep7ParseError("Missing SEP-7 query parameters");
  }

  const operation = uri.slice(SEP7_SCHEME.length, queryIndex);

  if (operation !== SEP7_TX_OPERATION) {
    throw new Sep7ParseError(`Unsupported SEP-7 operation: "${operation}"`);
  }

  const query = new URLSearchParams(uri.slice(queryIndex + 1));
  const xdr = query.get("xdr");

  if (xdr === null || xdr.length === 0) {
    throw new Sep7ParseError("Missing required xdr parameter");
  }

  return {
    xdr,
    callback: query.get("callback") ?? undefined,
    pubkey: query.get("pubkey") ?? undefined,
    msg: query.get("msg") ?? undefined,
    networkPassphrase: query.get("network_passphrase") ?? undefined,
    originDomain: query.get("origin_domain") ?? undefined,
    signature: query.get("signature") ?? undefined,
  };
}
