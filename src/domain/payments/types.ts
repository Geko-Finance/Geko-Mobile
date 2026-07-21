/** A SEP-7 'pay' request: pay a destination with an optional amount/asset/memo, regardless of source asset. */
export interface Sep7PayRequest {
  readonly kind: "pay";
  readonly destination: string;
  readonly amount?: string;
  readonly assetCode?: string;
  readonly assetIssuer?: string;
  readonly memo?: string;
  readonly message?: string;
}

/** A SEP-7 'tx' request: sign a specific pre-built transaction envelope XDR. */
export interface Sep7TxRequest {
  readonly kind: "tx";
  readonly xdr: string;
  readonly networkPassphrase: string;
  readonly message?: string;
  /** Which public key/signer the URI handler should sign for, if the request specifies one. */
  readonly pubkey?: string;
}

export type Sep7Request = Sep7PayRequest | Sep7TxRequest;
