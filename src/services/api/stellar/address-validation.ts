/**
 * `@stellar/stellar-sdk` runtime imports stay forbidden in app code (see stellar-client.ts).
 * `PublicKeypair.fromPublicKey` from `@stellar/typescript-wallet-sdk` performs the real
 * StrKey/SEP-23 checksum check internally; it's the same module `stellar-client.ts` already
 * pulls in at runtime via `Wallet`, so this adds no new bundle risk.
 */
import { PublicKeypair } from "@stellar/typescript-wallet-sdk";

/** Full checksum validation for a Stellar G... public key (not just format). */
export function isValidStellarAddress(address: string): boolean {
  try {
    PublicKeypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}
