import type { WalletCustody } from "./account";

/** Network context required when signing a transaction. */
export interface SignTransactionOptions {
  readonly networkPassphrase: string;
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
   * Signs a base64 transaction-envelope XDR and returns the signed envelope XDR.
   * Transactions cross this boundary as base64 transaction-envelope XDR strings (in and out)
   * so the domain never depends on any Stellar SDK type.
   */
  signTransaction(
    transactionXdr: string,
    options: SignTransactionOptions,
  ): Promise<string>;
}
