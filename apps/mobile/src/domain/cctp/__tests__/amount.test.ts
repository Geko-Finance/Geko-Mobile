import { describe, expect, it } from "@jest/globals";

import {
  remoteAmountToStellarAmount,
  remoteAmountToUnits,
  stellarAmountToRemoteAmount,
  stellarAmountToUnits,
  unitsToRemoteAmount,
  unitsToStellarAmount,
} from "../amount";

describe("stellarAmountToUnits / unitsToStellarAmount", () => {
  it("round-trips a 7-decimal amount", () => {
    expect(stellarAmountToUnits("12.5")).toBe(125000000n);
    expect(unitsToStellarAmount(125000000n)).toBe("12.5");
  });

  it("round-trips a whole number", () => {
    expect(stellarAmountToUnits("10")).toBe(100000000n);
    expect(unitsToStellarAmount(100000000n)).toBe("10");
  });

  it("rejects more than 7 fractional digits", () => {
    expect(() => stellarAmountToUnits("1.12345678")).toThrow();
  });

  it("rejects a negative amount", () => {
    expect(() => stellarAmountToUnits("-1")).toThrow();
  });
});

describe("remoteAmountToUnits / unitsToRemoteAmount", () => {
  it("round-trips a 6-decimal amount", () => {
    expect(remoteAmountToUnits("12.5")).toBe(12500000n);
    expect(unitsToRemoteAmount(12500000n)).toBe("12.5");
  });

  it("rejects more than 6 fractional digits", () => {
    expect(() => remoteAmountToUnits("1.1234567")).toThrow();
  });
});

describe("cross-chain precision conversion", () => {
  it("truncates the 7th Stellar decimal when converting down to 6dp", () => {
    expect(stellarAmountToRemoteAmount("1.2345678")).toBe("1.234567");
  });

  it("converts a 6dp remote amount up to 7dp exactly", () => {
    expect(remoteAmountToStellarAmount("1.234567")).toBe("1.234567");
  });

  it("is consistent for whole numbers", () => {
    expect(stellarAmountToRemoteAmount("100")).toBe("100");
    expect(remoteAmountToStellarAmount("100")).toBe("100");
  });
});
