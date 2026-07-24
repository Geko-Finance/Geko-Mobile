import type { WalletAccount } from "@/src/domain/wallet";
import { useSessionStore } from "@/src/features/auth/session/session-store";
import { fundTestnetAccount } from "@/src/services/api/stellar/friendbot";

import { getCavosClient } from "./cavos-client";
import { CavosProviderUnavailableError } from "./cavos-errors";

/**
 * TEMPORARY: exactly one custodial Cavos wallet per real-user identity, created
 * automatically during onboarding and funded via Friendbot on testnet. Nothing
 * in the app currently offers a "create another custodial wallet" flow, so this
 * holds structurally even though `WalletAccount[]`/`ownerUserId` already support
 * many accounts per owner (see WalletScreen's watch-only/test-wallet additions).
 *
 * The real blocker for multi-wallet-per-user later isn't the local data model -
 * it's that Cavos's connect(identity) is deterministic: the SAME identity always
 * resolves to the SAME on-chain address. Genuine multiple custodial wallets per
 * user will need either Cavos-side multi-wallet derivation (check their docs
 * when this becomes real work) or a per-slot identity scheme on our own backend
 * (e.g. `${realUserId}:0`, `${realUserId}:1`, ...) once one exists to track which
 * slots a user has created. Don't build an "add another custodial wallet" button
 * against the current identity shape without solving this first.
 */

/** Result of creating a custodial Cavos wallet for the authenticated session. */
export interface ConnectCustodialAccountResult {
  readonly account: WalletAccount;
  /**
   * True when Cavos doesn't recognize this device for this wallet yet - the
   * caller must collect the account's recovery code and approve this device
   * (see `useRecoverWithCode`) before it can sign transactions.
   */
  readonly needsDeviceApproval: boolean;
  /**
   * Plaintext recovery code revealed exactly once at wallet creation. Present
   * only when the backend returns `revealOnce.recoveryCode` — it can never be
   * re-fetched afterward. The caller must show/confirm it to the user before
   * leaving onboarding.
   */
  readonly recoveryCode?: string;
}

/**
 * Creates a custodial Cavos wallet for the current authenticated session via
 * `POST /wallets`, and returns a custodial WalletAccount for local registration.
 * `ownerUserId` comes from the session store (Bearer-scoped on the backend);
 * there is no identity parameter to pass. Friendbot funding is best-effort on
 * testnet.
 */
export async function connectCustodialAccount(
  name?: string
): Promise<ConnectCustodialAccountResult> {
  const session = useSessionStore.getState().session;

  if (session === null) {
    throw new CavosProviderUnavailableError(
      "Authentication required to create a custodial wallet"
    );
  }

  const { wallet, revealOnce } = await getCavosClient().createWallet();

  // Cavos sponsors on-chain account creation but leaves 0 XLM spendable; Friendbot tops
  // up testnet wallets. Safe to call on every create, not just the first time - Friendbot
  // no-ops harmlessly against an already-funded account, and this call is best-effort.
  try {
    await fundTestnetAccount(wallet.publicAddress);
  } catch {
    // Best-effort only - unavailable on mainnet or transient failures must not block connecting.
  }

  return {
    account: {
      createdAt: new Date().toISOString(),
      custody: "custodial",
      id: wallet.id,
      name: name?.trim() || wallet.label?.trim() || "Cavos Wallet",
      ownerUserId: session.user.id,
      publicKey: wallet.publicAddress,
    },
    needsDeviceApproval: wallet.status === "needs_device_approval",
    ...(revealOnce?.recoveryCode !== undefined
      ? { recoveryCode: revealOnce.recoveryCode }
      : {}),
  };
}
