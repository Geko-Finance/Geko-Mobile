import { describe, expect, it } from "@jest/globals";

import { cctpChainDisplayName, cctpChainTxUrl, stellarTxUrl } from "../explorers";

describe("stellarTxUrl", () => {
  it("points at stellar.expert on the matching network", () => {
    expect(stellarTxUrl("testnet", "abc")).toBe("https://stellar.expert/explorer/testnet/tx/abc");
    expect(stellarTxUrl("mainnet", "abc")).toBe("https://stellar.expert/explorer/public/tx/abc");
  });
});

describe("cctpChainTxUrl", () => {
  it("uses each chain's explorer, and its testnet explorer on testnet", () => {
    expect(cctpChainTxUrl("ethereum", "testnet", "0x1")).toBe("https://sepolia.etherscan.io/tx/0x1");
    expect(cctpChainTxUrl("ethereum", "mainnet", "0x1")).toBe("https://etherscan.io/tx/0x1");
    expect(cctpChainTxUrl("base", "testnet", "0x1")).toBe("https://sepolia.basescan.org/tx/0x1");
    expect(cctpChainTxUrl("base", "mainnet", "0x1")).toBe("https://basescan.org/tx/0x1");
  });

  it("routes Stellar transactions to stellar.expert", () => {
    expect(cctpChainTxUrl("stellar", "testnet", "abc")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc"
    );
  });
});

describe("cctpChainDisplayName", () => {
  it("names the testnet a remote chain actually uses on testnet", () => {
    expect(cctpChainDisplayName("ethereum", "testnet")).toBe("Ethereum Sepolia");
    expect(cctpChainDisplayName("base", "testnet")).toBe("Base Sepolia");
    expect(cctpChainDisplayName("ethereum", "mainnet")).toBe("Ethereum");
    expect(cctpChainDisplayName("stellar", "testnet")).toBe("Stellar");
  });
});
