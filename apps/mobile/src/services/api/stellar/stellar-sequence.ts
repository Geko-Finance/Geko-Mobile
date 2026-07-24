import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
} from "./stellar-config";

interface HorizonAccountRecord {
  sequence: string;
}

/**
 * Fetches the current on-ledger sequence number for an account from Horizon.
 */
export async function fetchAccountSequence(
  publicKey: string,
  networkId?: StellarNetworkId
): Promise<string> {
  const config =
    networkId === undefined
      ? getActiveStellarNetwork()
      : STELLAR_NETWORKS[networkId];

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.requestTimeoutMs
  );

  try {
    const response = await fetch(
      `${config.horizonUrl}/accounts/${encodeURIComponent(publicKey)}`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new ApiError("Failed to fetch account sequence", response.status);
    }

    const body = (await response.json()) as HorizonAccountRecord;

    return body.sequence;
  } finally {
    clearTimeout(timeout);
  }
}
