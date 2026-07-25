import type { Asset } from "@/src/domain/wallet";

/** Stellar memo type a SEP-7 pay request can specify alongside its memo value. */
export type Sep7MemoType = "MEMO_TEXT" | "MEMO_ID" | "MEMO_HASH" | "MEMO_RETURN";

/**
 * A parsed (or to-be-built) SEP-7 `pay` request - a request to pay a specific destination,
 * optionally pinning an amount/asset/memo. Mirrors `Sep7TxRequest`'s optional metadata fields
 * (services/sep7/sep7-uri.ts) for consistency between the two SEP-7 request shapes this app
 * understands; `asset` reuses the existing wallet `Asset` type rather than a parallel shape.
 */
export interface Sep7PaymentRequest {
  readonly destination: string;
  readonly amount?: string;
  readonly asset?: Asset;
  readonly memo?: string;
  readonly memoType?: Sep7MemoType;
  readonly callback?: string;
  readonly msg?: string;
  readonly networkPassphrase?: string;
  readonly originDomain?: string;
  readonly signature?: string;
}
