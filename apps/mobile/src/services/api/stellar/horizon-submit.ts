import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
} from "./stellar-config";

interface HorizonResultCodes {
  transaction: string;
  operations?: string[];
}

interface HorizonErrorResponse {
  title?: string;
  detail?: string;
  extras?: {
    result_codes?: HorizonResultCodes;
  };
}

interface HorizonSubmitSuccessResponse {
  hash: string;
}

function buildHorizonErrorMessage(body: HorizonErrorResponse): string {
  const resultCodes = body.extras?.result_codes;
  if (resultCodes !== undefined) {
    const codes = [
      resultCodes.transaction,
      ...(resultCodes.operations ?? []),
    ];
    return codes.join(": ");
  }

  return body.detail ?? body.title ?? "Horizon submission failed";
}

/**
 * Submits a signed transaction XDR to Horizon for broadcast.
 */
export async function submitSignedTransaction(
  signedXdr: string,
  networkId?: StellarNetworkId
): Promise<{ hash: string }> {
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
    const response = await fetch(`${config.horizonUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `tx=${encodeURIComponent(signedXdr)}`,
      signal: controller.signal,
    });

    const body = (await response.json()) as
      | HorizonSubmitSuccessResponse
      | HorizonErrorResponse;

    if (!response.ok) {
      throw new ApiError(
        buildHorizonErrorMessage(body as HorizonErrorResponse),
        response.status
      );
    }

    return { hash: (body as HorizonSubmitSuccessResponse).hash };
  } finally {
    clearTimeout(timeout);
  }
}
