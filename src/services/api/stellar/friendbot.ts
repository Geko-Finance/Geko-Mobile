import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
} from "./stellar-config";

/**
 * Funds a testnet account via Friendbot for the given network (defaults to active).
 */
export async function fundTestnetAccount(
  publicKey: string,
  networkId?: StellarNetworkId
): Promise<void> {
  const config =
    networkId === undefined
      ? getActiveStellarNetwork()
      : STELLAR_NETWORKS[networkId];

  if (config.friendbotUrl === undefined) {
    throw new ApiError("Friendbot is only available on testnet", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.requestTimeoutMs
  );

  try {
    const response = await fetch(
      `${config.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new ApiError("Friendbot funding failed", response.status);
    }
  } finally {
    clearTimeout(timeout);
  }
}
