import { appConfig } from "@/src/config/env";

import { CCTP_IRIS_API_BASE_URL } from "./cctp-config";
import {
  CctpAttestationFailedError,
  CctpAttestationPendingError,
  CctpProviderUnavailableError,
} from "./cctp-errors";
import type { CctpWireMessage, CctpWireMessagesResponse } from "./cctp-types";

export interface CctpAttestationResult {
  readonly messageBytes: string;
  readonly attestation: string;
}

async function requestIris<T>(path: string): Promise<T> {
  const baseUrl = CCTP_IRIS_API_BASE_URL[appConfig.stellarNetwork];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new CctpProviderUnavailableError(
        `Circle attestation API request failed (${response.status})`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CctpProviderUnavailableError) {
      throw error;
    }

    throw new CctpProviderUnavailableError(
      `Circle attestation API is unreachable: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  } finally {
    clearTimeout(timeout);
  }
}

function firstMessage(response: CctpWireMessagesResponse): CctpWireMessage | undefined {
  return response.messages?.[0];
}

/**
 * Fetches the CCTP message + attestation for a burn transaction, keyed by the source
 * chain's domain id and the burn's transaction hash (Circle's `GET /v2/messages/{domain}`
 * endpoint - https://developers.circle.com/cctp/technical-guide). Throws
 * `CctpAttestationPendingError` while Circle is still confirming/attesting (the normal,
 * expected state for most of a transfer's lifetime - callers poll on this, see
 * features/cctp/api/cctp-flow.ts's `pollAttestation`), and `CctpAttestationFailedError`
 * if Circle reports the message itself as failed (not retryable by polling again).
 */
export async function fetchCctpAttestation(
  sourceDomainId: number,
  burnTransactionHash: string
): Promise<CctpAttestationResult> {
  const response = await requestIris<CctpWireMessagesResponse>(
    `/v2/messages/${sourceDomainId}?transactionHash=${encodeURIComponent(burnTransactionHash)}`
  );
  const message = firstMessage(response);

  if (message === undefined || message.status === "pending_confirmations") {
    throw new CctpAttestationPendingError();
  }

  if (message.status === "failed") {
    throw new CctpAttestationFailedError();
  }

  if (message.message === undefined || message.attestation === undefined) {
    throw new CctpProviderUnavailableError(
      "Circle reported the attestation complete but omitted message/attestation bytes"
    );
  }

  return { messageBytes: message.message, attestation: message.attestation };
}
