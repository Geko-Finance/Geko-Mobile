import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Client } from "defindex-vault";

import type {
  SignTransactionOptions,
  SignTransactionResult,
  WalletSigner,
} from "@/src/domain/wallet/signer";

import { withdrawFromVault } from "../defindex-vault-service";
import { getActiveStellarNetwork } from "../../stellar/stellar-config";

jest.mock("defindex-vault", () => ({
  Client: jest.fn(),
}));

jest.mock("../../stellar/stellar-config", () => ({
  getActiveStellarNetwork: jest.fn(),
}));

const TEST_NETWORK = {
  id: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
};

describe("withdrawFromVault", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveStellarNetwork as unknown as jest.Mock).mockReturnValue(TEST_NETWORK);
  });

  it("throws for a custodial signer", async () => {
    const signer = {
      custody: "custodial",
      getAddress: jest.fn<() => Promise<string>>(),
      getPublicKey: jest.fn<() => Promise<string>>(),
      signTransaction: jest.fn<
        (
          transactionXdr: string,
          options: SignTransactionOptions,
        ) => Promise<SignTransactionResult>
      >(),
    } satisfies WalletSigner;

    await expect(
      withdrawFromVault(
        {
          vaultAddress: "CVAULT123",
          withdrawShares: 100n,
          minAmountsOut: [0n],
        },
        signer
      )
    ).rejects.toThrow(
      "Vault withdrawals need a non-custodial signer; Cavos only supports native XLM payments."
    );

    expect(signer.getAddress).not.toHaveBeenCalled();
  });

  it("withdraws shares and returns the withdrawn amounts", async () => {
    const withdrawMock = jest.fn<
      (input: {
        withdraw_shares: bigint;
        min_amounts_out: bigint[];
        from: string;
      }) => Promise<{
        signAndSend: () => Promise<{ result: { unwrap: () => bigint[] } }>;
      }>
    >().mockResolvedValue({
      signAndSend: jest.fn<
        () => Promise<{ result: { unwrap: () => bigint[] } }>
      >().mockResolvedValue({
        result: { unwrap: () => [500n] },
      }),
    });

    (Client as unknown as jest.Mock).mockImplementation(() => ({
      withdraw: withdrawMock,
    }));

    const signer = {
      custody: "non_custodial",
      getAddress: jest.fn<() => Promise<string>>().mockResolvedValue("GDEPOSITOR123"),
      getPublicKey: jest.fn<() => Promise<string>>(),
      signTransaction: jest.fn<
        (
          transactionXdr: string,
          options: SignTransactionOptions,
        ) => Promise<SignTransactionResult>
      >(),
    } satisfies WalletSigner;

    const result = await withdrawFromVault(
      {
        vaultAddress: "CVAULT456",
        withdrawShares: 500n,
        minAmountsOut: [0n],
      },
      signer
    );

    expect(result).toEqual({ amountsWithdrawn: [500n] });
    expect((Client as unknown as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        contractId: "CVAULT456",
        publicKey: "GDEPOSITOR123",
      })
    );
    expect(withdrawMock).toHaveBeenCalledWith({
      withdraw_shares: 500n,
      min_amounts_out: [0n],
      from: "GDEPOSITOR123",
    });
  });
});
