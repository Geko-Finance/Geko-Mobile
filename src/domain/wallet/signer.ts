import type { WalletCustody } from "./account";

/** Network context required when signing a transaction. */
export interface SignTransactionOptions {
  readonly networkPassphrase: string;
}

/** Result of signing a transaction envelope. */
export interface SignTransactionResult {
  /** Signed transaction envelope XDR (or the original envelope for custodial sign-and-submit flows). */
  readonly xdr: string;
  /** On-chain transaction hash when the signer also submitted; absent for sign-only flows. */
  readonly hash?: string;
}

/**
 * Provider-agnostic signing port.
 * Transactions cross this boundary as base64 transaction-envelope XDR strings (in and out)
 * so the domain never depends on any Stellar SDK type; custodial (Cavos) and non-custodial
 * adapters implement this port in separate epics and are interchangeable to consumers;
 * implementations MUST NOT log XDR payloads, addresses tied to users, keys, or any secret material.
 */
export interface WalletSigner {
  /** Custody model this signer implements. */
  readonly custody: WalletCustody;

  /** Returns the account address to use for operations (may be a muxed M... address in future custodial setups). */
  getAddress(): Promise<string>;

  /** Returns the underlying G... signing key. */
  getPublicKey(): Promise<string>;

  /**
   * Signs a base64 transaction-envelope XDR and returns the signed envelope XDR plus an
   * optional on-chain hash. Transactions cross this boundary as plain base64 XDR strings
   * (and an optional hash string) so the domain never depends on any Stellar SDK type.
   * For custodial signers that sign-and-submit atomically, `xdr` may be the original
   * envelope and `hash` is set when the provider returns a real submission hash.
   */
  signTransaction(
    transactionXdr: string,
    options: SignTransactionOptions,
  ): Promise<SignTransactionResult>;
}
