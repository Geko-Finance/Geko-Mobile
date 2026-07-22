/**
 * Wallet custody model. There are two ways this app can give a user a real,
 * signing-capable wallet:
 *   - `custodial` - keys held by a third-party signer (Cavos). This is the ONLY
 *     one implemented today: see src/services/api/cavos/* and
 *     src/features/onboarding/screens/CustodialOnboardingScreen.tsx.
 *   - `non_custodial` - keys held on-device (e.g. in SecureStore), signed locally
 *     with no third party in the loop. This value is reserved in the type but has
 *     NO factory and NO WalletSigner implementation yet - do not assume it works;
 *     `canSend()` below already excludes it. Build it as its own epic (device
 *     keypair generation/storage, a local-signing WalletSigner adapter) rather
 *     than assuming it can reuse the Cavos plumbing.
 *   - `watch_only` - the app tracks the address but holds no keys at all
 *     (pasted/watched addresses and Friendbot-funded dev accounts); such accounts
 *     can never sign.
 */
export type WalletCustody = "custodial" | "non_custodial" | "watch_only";

/**
 * App-level wallet account.
 * `id` is the app-level account identity used in routes/state - it may coincidentally equal
 * `publicKey` today but callers must never assume that;
 * `publicKey` is the Stellar G... address;
 * `createdAt` is ISO-8601;
 * `ownerUserId` is the session user id that added this account - wallet-store persists
 * across sign-outs, so every read path must filter by it to avoid one signed-in profile
 * seeing another profile's locally-cached accounts on the same device.
 */
export interface WalletAccount {
  readonly createdAt: string;
  readonly custody: WalletCustody;
  readonly id: string;
  readonly name: string;
  readonly ownerUserId: string;
  readonly publicKey: string;
}

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Format-only Stellar public key check: exactly 56 characters, starts with `G`, remaining
 * characters in the base32 alphabet A–Z / 2–7.
 * This is a cheap format check, NOT a checksum validation - Horizon remains the source of
 * truth (invalid keys surface as request errors).
 */
export function isLikelyStellarPublicKey(value: string): boolean {
  return STELLAR_PUBLIC_KEY_PATTERN.test(value);
}

/**
 * Whether this account can send/sign transactions in the app today.
 * Only custodial accounts (backed by a real signer, e.g. Cavos) qualify;
 * `watch_only` accounts hold no keys, and `non_custodial` has no signer implementation yet.
 */
export function canSend(account: WalletAccount): boolean {
  return account.custody === "custodial";
}

/**
 * Factory for watched addresses; `id` equals `publicKey` for watch-only accounts.
 */
export function makeWatchOnlyAccount(
  name: string,
  publicKey: string,
  ownerUserId: string,
): WalletAccount {
  return {
    createdAt: new Date().toISOString(),
    custody: "watch_only",
    id: publicKey,
    name: name.trim(),
    ownerUserId,
    publicKey,
  };
}
