import { describe, expect, it } from "@jest/globals";

import {
  canAutoCompleteMint,
  canTransition,
  isResumable,
  isTerminalStatus,
  nextStep,
  type CctpTransfer,
} from "..";

const BASE: CctpTransfer = {
  id: "t1",
  ownerUserId: "user-1",
  direction: "stellar_to_remote",
  sourceChainId: "stellar",
  destinationChainId: "ethereum",
  stellarPublicKey: "GA...",
  recipientAddress: "0x0000000000000000000000000000000000dEaD",
  amount: "10",
  status: "initiated",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("canTransition", () => {
  it("allows the happy-path sequence", () => {
    expect(canTransition("initiated", "burning")).toBe(true);
    expect(canTransition("burning", "burned")).toBe(true);
    expect(canTransition("burned", "attesting")).toBe(true);
    expect(canTransition("attesting", "attested")).toBe(true);
    expect(canTransition("attested", "minting")).toBe(true);
    expect(canTransition("minting", "minted")).toBe(true);
  });

  it("rejects skipping a step", () => {
    expect(canTransition("initiated", "burned")).toBe(false);
    expect(canTransition("burned", "minting")).toBe(false);
    expect(canTransition("attested", "minted")).toBe(false);
  });

  it("rejects any transition out of a terminal minted state", () => {
    expect(canTransition("minted", "burning")).toBe(false);
    expect(canTransition("minted", "failed")).toBe(false);
  });

  it("allows retrying from failed back into the in-flight step, never back to initiated", () => {
    expect(canTransition("failed", "burning")).toBe(true);
    expect(canTransition("failed", "attesting")).toBe(true);
    expect(canTransition("failed", "minting")).toBe(true);
    expect(canTransition("failed", "initiated")).toBe(false);
  });
});

describe("isTerminalStatus / isResumable", () => {
  it("treats minted and failed as terminal, everything else as not", () => {
    expect(isTerminalStatus("minted")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("attesting")).toBe(false);
  });

  it("still considers a failed transfer resumable (retryable)", () => {
    expect(isResumable({ ...BASE, status: "failed" })).toBe(true);
    expect(isResumable({ ...BASE, status: "attesting" })).toBe(true);
    expect(isResumable({ ...BASE, status: "minted" })).toBe(false);
  });
});

describe("canAutoCompleteMint", () => {
  it("is only true for remote_to_stellar, since only Stellar-side steps can be signed by this wallet", () => {
    expect(canAutoCompleteMint("remote_to_stellar")).toBe(true);
    expect(canAutoCompleteMint("stellar_to_remote")).toBe(false);
  });
});

describe("nextStep", () => {
  it("starts at burn when nothing is persisted yet", () => {
    expect(nextStep(BASE)).toBe("burn");
  });

  it("moves to attestation once a burn hash is persisted", () => {
    expect(nextStep({ ...BASE, status: "burned", burnTxHash: "hash-1" })).toBe("attestation");
  });

  it("moves to mint once message + attestation are persisted", () => {
    expect(
      nextStep({
        ...BASE,
        status: "attested",
        burnTxHash: "hash-1",
        messageBytes: "0x01",
        attestation: "0x02",
      })
    ).toBe("mint");
  });

  it("is done once a mint hash is persisted, regardless of status bookkeeping", () => {
    expect(
      nextStep({
        ...BASE,
        status: "minted",
        burnTxHash: "hash-1",
        messageBytes: "0x01",
        attestation: "0x02",
        mintTxHash: "hash-2",
      })
    ).toBe("done");
  });

  it("flags verify_burn instead of burn when interrupted mid-submission - resubmitting could double-burn", () => {
    expect(nextStep({ ...BASE, status: "burning" })).toBe("verify_burn");
  });

  it("never regresses to verify_burn once a burn hash is actually persisted", () => {
    expect(nextStep({ ...BASE, status: "burning", burnTxHash: "hash-1" })).toBe("attestation");
  });
});
