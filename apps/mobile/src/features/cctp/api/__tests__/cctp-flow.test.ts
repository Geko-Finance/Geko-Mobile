import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { WalletSigner } from "@/src/domain/wallet";
import {
  CctpAttestationFailedError,
  CctpAttestationPendingError,
  depositForBurn,
  fetchCctpAttestation,
  receiveMessage,
} from "@/src/services/api/cctp";

import { useCctpTransferStore } from "../../state/transfer-store";
import {
  CctpFlowError,
  completeMintStep,
  pollAttestationStep,
  recordExternalBurn,
  resumeCctpTransfer,
  runBurnStep,
  startOutboundTransfer,
} from "../cctp-flow";

jest.mock("@/src/services/api/cctp", () => {
  const actualErrors = jest.requireActual<typeof import("@/src/services/api/cctp/cctp-errors")>(
    "@/src/services/api/cctp/cctp-errors"
  );

  return {
    depositForBurn: jest.fn(),
    fetchCctpAttestation: jest.fn(),
    receiveMessage: jest.fn(),
    CctpAttestationPendingError: actualErrors.CctpAttestationPendingError,
    CctpAttestationFailedError: actualErrors.CctpAttestationFailedError,
  };
});

const mockDepositForBurn = depositForBurn as jest.MockedFunction<typeof depositForBurn>;
const mockFetchAttestation = fetchCctpAttestation as jest.MockedFunction<typeof fetchCctpAttestation>;
const mockReceiveMessage = receiveMessage as jest.MockedFunction<typeof receiveMessage>;

const OWNER_USER_ID = "user-1";
const STELLAR_PUBLIC_KEY = "GABCDEXAMPLE";

const fakeSigner: WalletSigner = {
  custody: "non_custodial",
  getAddress: async () => STELLAR_PUBLIC_KEY,
  getPublicKey: async () => STELLAR_PUBLIC_KEY,
  signTransaction: async (xdr) => ({ xdr }),
};

beforeEach(() => {
  useCctpTransferStore.setState({ transfers: [] });
  jest.clearAllMocks();
});

describe("runBurnStep (stellar_to_remote)", () => {
  it("burns and advances the transfer to burned", async () => {
    startOutboundTransfer({
      id: "t1",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    mockDepositForBurn.mockResolvedValue({ burnTxHash: "burn-hash" });

    const result = await runBurnStep({
      transferId: "t1",
      amountUnits: 100000000n,
      mintRecipientHex: "0x00",
      signer: fakeSigner,
    });

    expect(result.status).toBe("burned");
    expect(result.burnTxHash).toBe("burn-hash");
    expect(mockDepositForBurn).toHaveBeenCalledTimes(1);
  });

  it("marks the transfer failed (not burning forever) when the burn call throws", async () => {
    startOutboundTransfer({
      id: "t2",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    mockDepositForBurn.mockRejectedValue(new Error("network down"));

    await expect(
      runBurnStep({
        transferId: "t2",
        amountUnits: 100000000n,
        mintRecipientHex: "0x00",
        signer: fakeSigner,
      })
    ).rejects.toThrow("network down");

    const stored = useCctpTransferStore.getState().transfers.find((t) => t.id === "t2");
    expect(stored?.status).toBe("failed");
    expect(stored?.failedStep).toBe("burn");
  });
});

describe("resumeCctpTransfer - burn funds-safety guard", () => {
  it("refuses to auto-resubmit a burn interrupted mid-submission, and never calls depositForBurn again", async () => {
    startOutboundTransfer({
      id: "t3",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    // Simulate a crash after the "burning" transition was persisted but before
    // depositForBurn resolved - burnTxHash never got written.
    useCctpTransferStore.getState().advance("t3", "burning");

    await expect(
      resumeCctpTransfer("t3", {
        signer: fakeSigner,
        freshBurn: { amountUnits: 100000000n, mintRecipientHex: "0x00" },
      })
    ).rejects.toMatchObject({ code: "NEEDS_BURN_VERIFICATION" } satisfies Partial<CctpFlowError>);

    expect(mockDepositForBurn).not.toHaveBeenCalled();
  });

  it("proceeds with a fresh burn when the transfer never left initiated", async () => {
    startOutboundTransfer({
      id: "t4",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    mockDepositForBurn.mockResolvedValue({ burnTxHash: "burn-hash" });

    const result = await resumeCctpTransfer("t4", {
      signer: fakeSigner,
      freshBurn: { amountUnits: 100000000n, mintRecipientHex: "0x00" },
    });

    expect(result.status).toBe("burned");
    expect(mockDepositForBurn).toHaveBeenCalledTimes(1);
  });
});

describe("pollAttestationStep", () => {
  it("stays in attesting without throwing while Circle is pending", async () => {
    startOutboundTransfer({
      id: "t5",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    useCctpTransferStore.getState().advance("t5", "burning");
    useCctpTransferStore.getState().advance("t5", "burned", { burnTxHash: "burn-hash" });
    mockFetchAttestation.mockRejectedValue(new CctpAttestationPendingError());

    const result = await pollAttestationStep("t5");

    expect(result.status).toBe("attesting");
  });

  it("advances to attested once Circle completes attestation", async () => {
    startOutboundTransfer({
      id: "t6",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    useCctpTransferStore.getState().advance("t6", "burning");
    useCctpTransferStore.getState().advance("t6", "burned", { burnTxHash: "burn-hash" });
    mockFetchAttestation.mockResolvedValue({ messageBytes: "0xmsg", attestation: "0xattn" });

    const result = await pollAttestationStep("t6");

    expect(result.status).toBe("attested");
    expect(result.messageBytes).toBe("0xmsg");
    expect(result.attestation).toBe("0xattn");
  });

  it("marks the transfer failed when Circle reports the message as failed", async () => {
    startOutboundTransfer({
      id: "t7",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });
    useCctpTransferStore.getState().advance("t7", "burning");
    useCctpTransferStore.getState().advance("t7", "burned", { burnTxHash: "burn-hash" });
    mockFetchAttestation.mockRejectedValue(new CctpAttestationFailedError());

    await expect(pollAttestationStep("t7")).rejects.toBeInstanceOf(CctpAttestationFailedError);

    const stored = useCctpTransferStore.getState().transfers.find((t) => t.id === "t7");
    expect(stored?.status).toBe("failed");
    expect(stored?.failedStep).toBe("attestation");
  });
});

describe("completeMintStep", () => {
  it("refuses to auto-mint a stellar_to_remote transfer - this wallet holds no signer for the remote chain", async () => {
    startOutboundTransfer({
      id: "t8",
      ownerUserId: OWNER_USER_ID,
      direction: "stellar_to_remote",
      sourceChainId: "stellar",
      destinationChainId: "ethereum",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: "0x000000000000000000000000000000000000ad",
      amount: "10",
    });

    await expect(completeMintStep({ transferId: "t8", signer: fakeSigner })).rejects.toMatchObject({
      code: "CANNOT_AUTO_MINT",
    } satisfies Partial<CctpFlowError>);
    expect(mockReceiveMessage).not.toHaveBeenCalled();
  });

  it("mints and advances a remote_to_stellar transfer to minted", async () => {
    recordExternalBurn({
      id: "t9",
      ownerUserId: OWNER_USER_ID,
      direction: "remote_to_stellar",
      sourceChainId: "ethereum",
      destinationChainId: "stellar",
      stellarPublicKey: STELLAR_PUBLIC_KEY,
      recipientAddress: STELLAR_PUBLIC_KEY,
      amount: "10",
      burnTxHash: "external-burn-hash",
    });
    useCctpTransferStore
      .getState()
      .advance("t9", "attesting");
    useCctpTransferStore
      .getState()
      .advance("t9", "attested", { messageBytes: "0xmsg", attestation: "0xattn" });
    mockReceiveMessage.mockResolvedValue({ mintTxHash: "mint-hash" });

    const result = await completeMintStep({ transferId: "t9", signer: fakeSigner });

    expect(result.status).toBe("minted");
    expect(result.mintTxHash).toBe("mint-hash");
  });
});
