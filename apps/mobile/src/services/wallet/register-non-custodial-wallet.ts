import { apiRequest } from "@/src/services/api/api-client";

import { LocalWalletError } from "./local-wallet-errors";

/**
 * Registers an already-stored on-device wallet with the backend so it appears in
 * `GET /wallets` and receives `wallet.created` notifications. Does not change
 * local key material — callers keep `WalletAccount.id === publicKey`.
 */
export async function registerNonCustodialWallet(
  publicKey: string,
): Promise<void> {
  try {
    await apiRequest("/wallets", {
      method: "POST",
      body: {
        custodyType: "non_custodial",
        publicKey,
      },
      requiresAuth: true,
    });
  } catch {
    throw new LocalWalletError(
      "SYNC_FAILED",
      "Couldn't sync this wallet to Geko. It's saved on this device — try again later.",
    );
  }
}
