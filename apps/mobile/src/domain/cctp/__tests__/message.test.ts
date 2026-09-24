import { describe, expect, it } from "@jest/globals";

import {
  buildBurnMessage,
  forwarderHookDataHex,
  TESTNET_FORWARDER_BYTES32,
} from "../__fixtures__/burn-message";
import { decodeCctpV2BurnMessage, parseForwarderHookData } from "../message";

const G = "GCSOSV3XI4THCVN6MSBLLY3SXNTSRU35MTMDMV2WDW2SLXF2AZYEBPGK";

describe("decodeCctpV2BurnMessage", () => {
  it("reads routing fields, amount and hook data from a v2 burn message", () => {
    const decoded = decodeCctpV2BurnMessage(
      buildBurnMessage({ amount: 1000000n, feeExecuted: 25n, hookData: forwarderHookDataHex(G) })
    );

    expect(decoded.sourceDomain).toBe(0);
    expect(decoded.destinationDomain).toBe(27);
    expect(decoded.destinationCaller).toBe(`0x${TESTNET_FORWARDER_BYTES32}`);
    expect(decoded.mintRecipient).toBe(`0x${TESTNET_FORWARDER_BYTES32}`);
    expect(decoded.amount).toBe(1000000n);
    expect(decoded.feeExecuted).toBe(25n);
    expect(parseForwarderHookData(decoded.hookData)).toBe(G);
  });

  it("rejects bytes too short to be a burn message", () => {
    expect(() => decodeCctpV2BurnMessage("0x1234")).toThrow();
  });
});

describe("parseForwarderHookData", () => {
  it("returns undefined for hook data that doesn't follow the forwarder layout", () => {
    expect(parseForwarderHookData("0x")).toBeUndefined();
    expect(parseForwarderHookData(`0x${"00".repeat(28)}00000063abcd`)).toBeUndefined();
  });
});
