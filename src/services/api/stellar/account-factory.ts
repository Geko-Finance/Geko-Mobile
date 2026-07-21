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

/**
 * Generates a real keypair for a self-custody account and returns both keys. The caller is
 * responsible for persisting `secretKey` via SecureStore and never logging it. Unlike
 * `createFundedTestAccount`, this does not fund the account — Friendbot only exists on testnet,
 * and on mainnet funding is a real XLM transfer a human must perform.
 */
export async function createNonCustodialAccount(): Promise<{
  publicKey: string;
  secretKey: string;
}> {
  const config = getActiveStellarNetwork();
  const wallet = createStellarWallet(config);
  const signingKeypair = wallet.stellar().account().createKeypair();

  return {
    publicKey: signingKeypair.publicKey,
    secretKey: signingKeypair.secretKey,
  };
}
