/**
 * Wallet custody model.
 * `watch_only` — the app tracks the address but holds no keys at all (pasted/watched addresses
 * and Friendbot-funded dev accounts); such accounts can never sign.
 */
export type WalletCustody = "custodial" | "non_custodial" | "watch_only";

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

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Format-only Stellar public key check: exactly 56 characters, starts with `G`, remaining
 * characters in the base32 alphabet A–Z / 2–7.
 * This is a cheap format check, NOT a checksum validation — Horizon remains the source of
 * truth (invalid keys surface as request errors).
 */
export function isLikelyStellarPublicKey(value: string): boolean {
  return STELLAR_PUBLIC_KEY_PATTERN.test(value);
}

/**
 * Factory for watched addresses; `id` equals `publicKey` for watch-only accounts.
 */
export function makeWatchOnlyAccount(
  name: string,
  publicKey: string,
): WalletAccount {
  return {
    createdAt: new Date().toISOString(),
    custody: "watch_only",
    id: publicKey,
    name: name.trim(),
    publicKey,
  };
}
