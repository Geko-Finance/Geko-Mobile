import "@/src/services/crypto/crypto-polyfill";

import type { StellarNetworkId } from "@/src/domain/wallet";

import { fundTestnetAccount } from "./friendbot";
import {
  STELLAR_NETWORKS,
  createStellarWallet,
  getActiveStellarNetwork,
} from "./stellar-config";

/**
 * Produces throwaway WATCH-ONLY testnet dev accounts. Real key custody
 * (generation + storage + signing) ships with the custody epics. Fails with
 * ApiError(400) on networks without Friendbot.
 */
export async function createFundedTestAccount(
  networkId?: StellarNetworkId
): Promise<{ publicKey: string }> {
  const config =
    networkId === undefined
      ? getActiveStellarNetwork()
      : STELLAR_NETWORKS[networkId];

  const wallet = createStellarWallet(config);
  const publicKey = wallet.stellar().account().createKeypair().publicKey;
  // Secret key is intentionally discarded; the resulting account is watch-only.

  await fundTestnetAccount(publicKey, networkId);

  return { publicKey };
}
