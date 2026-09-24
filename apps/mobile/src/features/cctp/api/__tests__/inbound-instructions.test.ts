import { describe, expect, it } from "@jest/globals";

import type { Balance } from "@/src/domain/wallet";

import { buildInboundInstructions, hasUsdcTrustline } from "../inbound-instructions";

const G = "GCSOSV3XI4THCVN6MSBLLY3SXNTSRU35MTMDMV2WDW2SLXF2AZYEBPGK";
const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("buildInboundInstructions", () => {
  it("gives the exact values an EVM-side burn needs to land on this Stellar account", () => {
    const instructions = buildInboundInstructions("testnet", G);

    expect(instructions.destinationDomain).toBe(27);
    // The testnet CctpForwarder as bytes32 - it must be both mintRecipient and destinationCaller.
    expect(instructions.forwarderRecipient).toBe(
      "0x3de86ac50b47eaf2840fe23e48179551660fd1072fba6f445d4a6bd7af4ab93e"
    );
    // 24 zero bytes, u32 version 0, u32 length 56, then the G-address as UTF-8.
    expect(instructions.hookData).toBe(
      `0x${"00".repeat(28)}00000038${Buffer.from(G, "utf8").toString("hex")}`
    );
  });
});

describe("hasUsdcTrustline", () => {
  const usdc = (issuer: string): Balance => ({
    amount: "0.0000000",
    asset: { code: "USDC", id: `USDC:${issuer}`, issuer, type: "credit_alphanum4" },
  });
  const xlm: Balance = { amount: "100", asset: { code: "XLM", id: "XLM", type: "native" } };

  it("is true only for Circle's USDC on the active network", () => {
    expect(hasUsdcTrustline([xlm, usdc(TESTNET_USDC_ISSUER)], "testnet")).toBe(true);
    expect(hasUsdcTrustline([xlm], "testnet")).toBe(false);
    expect(hasUsdcTrustline([xlm, usdc("GSOMEOTHERISSUER")], "testnet")).toBe(false);
  });
});
