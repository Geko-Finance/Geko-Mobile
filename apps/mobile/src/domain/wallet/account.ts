/**
 * Wallet custody model. There are two ways this app can give a user a real,
 * signing-capable wallet:
 *   - `custodial` - keys held by a third-party signer (Cavos). See
 *     src/services/api/cavos/* and
 *     src/features/onboarding/screens/CustodialOnboardingScreen.tsx.
 *   - `non_custodial` - keys held on-device (SecureStore), signed locally via
 *     LocalSigner with no third party in the loop. Factory + storage live in
 *     src/services/wallet/local-wallet-service.ts; onboarding is
 *     CreateSelfCustodyWalletScreen / ImportSelfCustodyWalletScreen.
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
 * Custodial (Cavos) and non-custodial (LocalSigner) accounts qualify;
 * `watch_only` accounts hold no keys and can never sign.
 */
export function canSend(account: WalletAccount): boolean {
  return (
    account.custody === "custodial" || account.custody === "non_custodial"
  );
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
