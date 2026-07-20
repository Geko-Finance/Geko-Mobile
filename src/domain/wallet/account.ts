/** Wallet custody model. */
export type WalletCustody = "custodial" | "non_custodial";

/**
 * App-level wallet account.
 * `id` is the app-level account identity used in routes/state — it may coincidentally equal
 * `publicKey` today but callers must never assume that;
 * `publicKey` is the Stellar G... address;
 * `createdAt` is ISO-8601.
 */
export interface WalletAccount {
  readonly createdAt: string;
  readonly custody: WalletCustody;
  readonly id: string;
  readonly name: string;
  readonly publicKey: string;
}
