import { describe, expect, it } from "@jest/globals";

import iris from "@/src/services/api/cctp/__fixtures__/iris-sandbox-complete-sepolia-to-stellar.json";

import { decodeCctpV2BurnMessage, parseForwarderHookData } from "../message";

// Real Iris sandbox response for a 1 USDC Ethereum Sepolia -> Stellar testnet burn
// (tx 0x5edfe956...908c1), routed through the testnet CctpForwarder.
describe("decodeCctpV2BurnMessage against a real Circle message", () => {
  const [message] = iris.messages;
  const decoded = decodeCctpV2BurnMessage(message.message);

  // Circle leaves Stellar-side fields (mintRecipient, destinationCaller) null in its own
  // decoding, which is why the app decodes the raw bytes instead of trusting Iris's JSON.
  it("matches Circle's own decoding of the same bytes", () => {
    expect(decoded.sourceDomain).toBe(Number(message.decodedMessage.sourceDomain));
    expect(decoded.destinationDomain).toBe(Number(message.decodedMessage.destinationDomain));
    expect(decoded.amount).toBe(BigInt(message.decodedMessage.decodedMessageBody.amount));
    expect(decoded.feeExecuted).toBe(BigInt(message.decodedMessage.decodedMessageBody.feeExecuted));
    expect(decoded.hookData).toBe(message.decodedMessage.decodedMessageBody.hookData.toLowerCase());
    expect(decoded.messageSender).toBe(message.decodedMessage.decodedMessageBody.messageSender.toLowerCase());
  });

  it("routes through the testnet forwarder to the Stellar account in the hook data", () => {
    const forwarder = "0x3de86ac50b47eaf2840fe23e48179551660fd1072fba6f445d4a6bd7af4ab93e";

    expect(decoded.mintRecipient).toBe(forwarder);
    expect(decoded.destinationCaller).toBe(forwarder);
    expect(parseForwarderHookData(decoded.hookData)).toBe(
      "GCSOSV3XI4THCVN6MSBLLY3SXNTSRU35MTMDMV2WDW2SLXF2AZYEBPGK"
    );
  });
});
