import "@/src/services/crypto/crypto-polyfill";

import type { Networks } from "@stellar/stellar-sdk";
import { StellarConfiguration, Wallet } from "@stellar/typescript-wallet-sdk";

import type { StellarNetworkId } from "@/src/domain/wallet";

import { fundTestnetAccount } from "./friendbot";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
  type StellarNetworkConfig,
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

  const wallet = createWallet(config);
  const publicKey = wallet.stellar().account().createKeypair().publicKey;
  // Secret key is intentionally discarded; the resulting account is watch-only.

  await fundTestnetAccount(publicKey, networkId);

  return { publicKey };
}

const createWallet = (config: StellarNetworkConfig): Wallet => {
  const stellarConfiguration = new StellarConfiguration({
    network: config.networkPassphrase as Networks,
    horizonUrl: config.horizonUrl,
  });

  return new Wallet({ stellarConfiguration });
};
