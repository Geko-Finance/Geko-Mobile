import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { CctpAttestationFailedError, CctpAttestationPendingError } from "../cctp-errors";
import { fetchCctpAttestation } from "../cctp-attestation-client";

function mockFetchOnce(status: number, body: unknown): void {
  (globalThis as { fetch: unknown }).fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = undefined;
});

describe("fetchCctpAttestation", () => {
  it("throws CctpAttestationPendingError while Circle is still confirming", async () => {
    mockFetchOnce(200, { messages: [{ status: "pending_confirmations" }] });

    await expect(fetchCctpAttestation(27, "hash-1")).rejects.toBeInstanceOf(
      CctpAttestationPendingError
    );
  });

  it("throws CctpAttestationPendingError when Circle has no message for this tx yet", async () => {
    mockFetchOnce(200, { messages: [] });

    await expect(fetchCctpAttestation(27, "hash-1")).rejects.toBeInstanceOf(
      CctpAttestationPendingError
    );
  });

  it("throws CctpAttestationFailedError when Circle reports the message failed", async () => {
    mockFetchOnce(200, { messages: [{ status: "failed" }] });

    await expect(fetchCctpAttestation(27, "hash-1")).rejects.toBeInstanceOf(
      CctpAttestationFailedError
    );
  });

  it("returns the message + attestation once complete", async () => {
    mockFetchOnce(200, {
      messages: [{ status: "complete", message: "0xaaaa", attestation: "0xbbbb" }],
    });

    await expect(fetchCctpAttestation(27, "hash-1")).resolves.toEqual({
      messageBytes: "0xaaaa",
      attestation: "0xbbbb",
    });
  });

  it("wraps a non-2xx response in a provider-unavailable error", async () => {
    mockFetchOnce(500, {});

    await expect(fetchCctpAttestation(27, "hash-1")).rejects.toThrow(
      "Circle attestation API request failed"
    );
  });
});
