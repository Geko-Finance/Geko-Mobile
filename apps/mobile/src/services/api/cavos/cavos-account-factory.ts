import type { WalletAccount } from "@/src/domain/wallet";
import { fundTestnetAccount } from "@/src/services/api/stellar/friendbot";

import { getCavosClient } from "./cavos-client";
import { setStoredCavosSession } from "./cavos-session-storage";
import type { CavosIdentity } from "./cavos-types";

/**
 * TEMPORARY: exactly one custodial Cavos wallet per real-user identity, created
 * automatically during onboarding and funded via Friendbot on testnet. Nothing
 * in the app currently offers a "create another custodial wallet" flow, so this
 * holds structurally even though `WalletAccount[]`/`ownerUserId` already support
 * many accounts per owner (see WalletScreen's watch-only/test-wallet additions).
 *
 * The real blocker for multi-wallet-per-user later isn't the local data model -
 * it's that `Cavos.connect(identity)` is deterministic: the SAME identity always
 * resolves to the SAME on-chain address. Genuine multiple custodial wallets per
 * user will need either Cavos-side multi-wallet derivation (check their docs
 * when this becomes real work) or a per-slot identity scheme on our own backend
 * (e.g. `${realUserId}:0`, `${realUserId}:1`, ...) once one exists to track which
 * slots a user has created. Don't build an "add another custodial wallet" button
 * against the current identity shape without solving this first.
 */

/** Result of connecting a custodial Cavos wallet for an identity on this device. */
export interface ConnectCustodialAccountResult {
  readonly account: WalletAccount;
  /**
   * True when Cavos doesn't recognize this device for this identity yet - the
   * caller must collect the account's recovery code and approve this device
   * (see `useRecoverWithCode`) before it can sign transactions.
   */
  readonly needsDeviceApproval: boolean;
}

/**
 * Connects a custodial Cavos wallet for the given identity, persists the session,
 * and returns a custodial WalletAccount for local registration. `Cavos.connect(identity)`
 * is deterministic - the same identity always resolves to the same address - so this
 * one call covers both first-time creation and reconnecting on a later device; there's
 * no separate "create" vs "recover" API. Runs automatically right after login for a
 * user with no local wallet yet, no manual create/recover step needed.
 */
export async function connectCustodialAccount(
  identity: CavosIdentity,
  name?: string
): Promise<ConnectCustodialAccountResult> {
  const session = await getCavosClient().connect(identity);
  await setStoredCavosSession(session);

  // Cavos sponsors on-chain account creation but leaves 0 XLM spendable; Friendbot tops
  // up testnet wallets. Safe to call on every connect, not just the first time - Friendbot
  // no-ops harmlessly against an already-funded account, and this call is best-effort.
  try {
    await fundTestnetAccount(session.address);
  } catch {
    // Best-effort only - unavailable on mainnet or transient failures must not block connecting.
  }

  return {
    account: {
      createdAt: new Date().toISOString(),
      custody: "custodial",
      id: session.address,
      name: name?.trim() || "Cavos Wallet",
      ownerUserId: identity.userId,
      publicKey: session.address,
    },
    needsDeviceApproval: session.status === "needs-device-approval",
  };
}
