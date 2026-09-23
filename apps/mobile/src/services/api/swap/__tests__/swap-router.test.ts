import type {
  SwapAggregator,
  SwapExecutionResult,
  SwapQuote,
  SwapQuoteRequest,
  SwapRoute,
} from "@/src/domain/swap";
import {
  NATIVE_ASSET,
  type WalletSigner,
} from "@/src/domain/wallet";

import { SwapRouter } from "../swap-router";

const USDC = {
  id: "USDC:GISSUER",
  code: "USDC",
  issuer: "GISSUER",
  type: "credit_alphanum4" as const,
};

const request: SwapQuoteRequest = {
  sourceAsset: NATIVE_ASSET,
  destinationAsset: USDC,
  sendAmount: "10",
  slippageBps: 50,
};

function quote(
  source: SwapQuote["source"],
  netReceiveAmount: string,
): SwapQuote {
  return {
    id: `${source}-quote`,
    source,
    sourceLabel: source,
    sourceAsset: NATIVE_ASSET,
    destinationAsset: USDC,
    sendAmount: "10",
    receiveAmount: netReceiveAmount,
    netReceiveAmount,
    minimumReceiveAmount: "9",
    feeAmount: "0",
    feeAsset: NATIVE_ASSET,
    priceImpactBps: 10,
    slippageBps: 50,
    route: [],
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    providerData: {},
  };
}

function adapter(result: SwapQuote): SwapAggregator {
  return {
    source: result.source,
    quote: jest.fn().mockResolvedValue(result),
    route: jest.fn().mockResolvedValue({
      quote: result,
      transactionXdr: "AAAA",
    } satisfies SwapRoute),
    execute: jest.fn().mockResolvedValue({
      hash: "hash",
      status: "submitted",
    } satisfies SwapExecutionResult),
  };
}

describe("SwapRouter", () => {
  it("compares all available adapters and selects the best net output", async () => {
    const soroswap = adapter(quote("soroswap", "9.5"));
    const native = adapter(quote("stellar-native", "9.7"));

    const result = await new SwapRouter([soroswap, native]).quote(request);

    expect(result.best.source).toBe("stellar-native");
    expect(result.quotes).toHaveLength(2);
    expect(soroswap.quote).toHaveBeenCalledWith(request);
    expect(native.quote).toHaveBeenCalledWith(request);
  });

  it("keeps the native fallback when an external source is unavailable", async () => {
    const soroswap = adapter(quote("soroswap", "9.8"));
    soroswap.quote = jest.fn().mockRejectedValue(new Error("unconfigured"));
    const native = adapter(quote("stellar-native", "9.4"));

    const result = await new SwapRouter([soroswap, native]).quote(request);

    expect(result.best.source).toBe("stellar-native");
    expect(result.unavailableSources).toEqual(["soroswap"]);
  });

  it("routes execution through the adapter that created the quote", async () => {
    const selectedQuote = quote("stellar-native", "9.7");
    const native = adapter(selectedQuote);
    const signer = {} as WalletSigner;

    await new SwapRouter([native]).execute(
      selectedQuote,
      "GACCOUNT",
      signer,
    );

    expect(native.route).toHaveBeenCalledWith(selectedQuote, "GACCOUNT");
    expect(native.execute).toHaveBeenCalledWith(
      expect.objectContaining({ quote: selectedQuote }),
      signer,
    );
  });

  it("refuses to execute an expired quote", async () => {
    const native = adapter(quote("stellar-native", "9.7"));
    const expired = {
      ...quote("stellar-native", "9.7"),
      expiresAt: new Date(Date.now() - 1).toISOString(),
    };

    await expect(
      new SwapRouter([native]).execute(
        expired,
        "GACCOUNT",
        {} as WalletSigner,
      ),
    ).rejects.toThrow("expired");
    expect(native.route).not.toHaveBeenCalled();
  });
});
