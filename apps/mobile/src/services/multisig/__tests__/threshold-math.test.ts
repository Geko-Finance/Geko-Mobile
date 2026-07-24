import { describe, expect, it } from "@jest/globals";

import type { SignerEntry, Thresholds } from "@/src/domain/multisig";

import {
  collectedWeight,
  isThresholdMet,
  isThresholdReachable,
  remainingWeight,
  requiredThreshold,
  thresholdCategoryForOperation,
} from "../threshold-math";

const MASTER_KEY = "GMASTER0000000000000000000000000000000000000000000000000";
const SIGNER_B = "GSIGNERB000000000000000000000000000000000000000000000000";
const SIGNER_C = "GSIGNERC000000000000000000000000000000000000000000000000";
const UNKNOWN_KEY = "GUNKNOWN000000000000000000000000000000000000000000000000";
const REVOKED_KEY = "GREVOKED000000000000000000000000000000000000000000000000";

const thresholds: Thresholds = {
  masterWeight: 1,
  low: 1,
  medium: 2,
  high: 3,
};

const signers: SignerEntry[] = [
  { key: MASTER_KEY, weight: 1 },
  { key: SIGNER_B, weight: 1 },
  { key: SIGNER_C, weight: 1 },
];

describe("thresholdCategoryForOperation", () => {
  it("maps payment to medium and set_options to high", () => {
    expect(thresholdCategoryForOperation("payment")).toBe("medium");
    expect(thresholdCategoryForOperation("set_options")).toBe("high");
  });
});

describe("requiredThreshold", () => {
  it("reads the threshold for the given category", () => {
    expect(requiredThreshold(thresholds, "low")).toBe(1);
    expect(requiredThreshold(thresholds, "medium")).toBe(2);
    expect(requiredThreshold(thresholds, "high")).toBe(3);
  });
});

describe("collectedWeight", () => {
  it("sums weight for matching signer keys", () => {
    expect(collectedWeight(signers, [MASTER_KEY, SIGNER_B])).toBe(2);
  });

  it("does not double-count a duplicated signer key", () => {
    expect(collectedWeight(signers, [SIGNER_B, SIGNER_B, SIGNER_B])).toBe(1);
  });

  it("ignores keys with no matching signer entry", () => {
    expect(collectedWeight(signers, [UNKNOWN_KEY])).toBe(0);
  });

  it("does not count a revoked (weight 0) signer", () => {
    const withRevoked: SignerEntry[] = [
      ...signers,
      { key: REVOKED_KEY, weight: 0 },
    ];

    expect(collectedWeight(withRevoked, [REVOKED_KEY])).toBe(0);
  });
});

describe("isThresholdMet", () => {
  it("is true once collected weight meets the threshold", () => {
    expect(isThresholdMet(thresholds, "medium", signers, [MASTER_KEY, SIGNER_B])).toBe(true);
  });

  it("is false when collected weight falls short", () => {
    expect(isThresholdMet(thresholds, "high", signers, [MASTER_KEY, SIGNER_B])).toBe(false);
  });

  it("is trivially true for a threshold of 0 even with no signatures", () => {
    const zeroThresholds: Thresholds = { ...thresholds, low: 0 };

    expect(isThresholdMet(zeroThresholds, "low", signers, [])).toBe(true);
  });
});

describe("remainingWeight", () => {
  it("returns how much more weight is needed", () => {
    expect(remainingWeight(thresholds, "high", signers, [MASTER_KEY])).toBe(2);
  });

  it("floors at 0 once the threshold is already exceeded", () => {
    expect(
      remainingWeight(thresholds, "low", signers, [MASTER_KEY, SIGNER_B, SIGNER_C]),
    ).toBe(0);
  });
});

describe("isThresholdReachable", () => {
  it("is true when the account's total signer weight can meet the threshold", () => {
    expect(isThresholdReachable(thresholds, "high", signers)).toBe(true);
  });

  it("is false when no combination of current signers could ever meet the threshold", () => {
    const impossible: Thresholds = { ...thresholds, high: 10 };

    expect(isThresholdReachable(impossible, "high", signers)).toBe(false);
  });
});
