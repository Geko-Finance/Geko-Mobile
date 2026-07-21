import type { WalletAccount } from "@/src/domain/wallet";
import { fundTestnetAccount } from "@/src/services/api/stellar/friendbot";

import { getCavosClient } from "./cavos-client";
import { setStoredCavosSession } from "./cavos-session-storage";
import type { CavosIdentity } from "./cavos-types";

/**
 * Connects a Cavos custodial wallet for the given identity, persists the session,
 * and returns a custodial WalletAccount for local registration.
 */
export async function createCustodialAccount(
  identity: CavosIdentity,
  name: string
): Promise<WalletAccount> {
  const session = await getCavosClient().connect(identity);
  await setStoredCavosSession(session);

  // Cavos sponsors on-chain account creation but leaves 0 XLM spendable; Friendbot tops up testnet wallets for testing.
  try {
    await fundTestnetAccount(session.address);
  } catch {
    // Best-effort only — unavailable on mainnet or transient failures must not block wallet creation.
  }

  return {
    createdAt: new Date().toISOString(),
    custody: "custodial",
    id: session.address,
    name: name.trim() || "Cavos Wallet",
    publicKey: session.address,
  };
}

/**
 * Reconnects a Cavos custodial wallet for the given identity (deterministic address)
 * and persists the session. Returns a WalletAccount with the placeholder name
 * `"Cavos Wallet"` — callers must preserve any existing local display name when
 * registering the recovered account (e.g. on a new device).
 */
export async function recoverCustodialAccount(
  identity: CavosIdentity
): Promise<WalletAccount> {
  const session = await getCavosClient().connect(identity);
  await setStoredCavosSession(session);

  return {
    createdAt: new Date().toISOString(),
    custody: "custodial",
    id: session.address,
    name: "Cavos Wallet",
    publicKey: session.address,
  };
}
