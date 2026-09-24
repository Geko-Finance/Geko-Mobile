import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { scValToNative } from "@stellar/stellar-sdk/base";
import { Buffer } from "buffer";

import type { WalletSigner } from "@/src/domain/wallet";

import { invokeSorobanContract } from "../../stellar/soroban-invoke";
import { getCctpStellarContracts } from "../cctp-config";
import { mintAndForward } from "../cctp-stellar-contract";

jest.mock("../../stellar/soroban-invoke", () => ({ invokeSorobanContract: jest.fn() }));
jest.mock("../../stellar/stellar-config", () => ({
  getActiveStellarNetwork: () => ({
    id: "testnet",
    rpcUrl: "https://rpc.example",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
}));

const mockInvoke = invokeSorobanContract as jest.MockedFunction<typeof invokeSorobanContract>;

const fakeSigner: WalletSigner = {
  custody: "non_custodial",
  getAddress: async () => "GPAYER",
  getPublicKey: async () => "GPAYER",
  signTransaction: async (xdr) => ({ xdr }),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mintAndForward", () => {
  it("calls CctpForwarder.mint_and_forward(message, attestation) - the only caller allowed to deliver a forwarded mint", async () => {
    mockInvoke.mockResolvedValue({ hash: "mint-hash", returnValue: undefined });

    const result = await mintAndForward({
      messageBytesHex: "0xaabb",
      attestationHex: "0xccdd",
      sourcePublicKey: "GPAYER",
      signer: fakeSigner,
    });

    expect(result).toEqual({ mintTxHash: "mint-hash" });
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    const call = mockInvoke.mock.calls[0][0];
    expect(call.contractId).toBe(getCctpStellarContracts("testnet").cctpForwarder);
    expect(call.method).toBe("mint_and_forward");
    expect(call.args).toHaveLength(2);
    expect(Buffer.from(scValToNative(call.args[0]) as Uint8Array).toString("hex")).toBe("aabb");
    expect(Buffer.from(scValToNative(call.args[1]) as Uint8Array).toString("hex")).toBe("ccdd");
    expect(call.sourcePublicKey).toBe("GPAYER");
  });
});
