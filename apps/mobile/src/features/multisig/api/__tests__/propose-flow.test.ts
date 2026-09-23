import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk/base";

import type { MultisigAccount } from "@/src/domain/multisig";
import {
  generateLocalWalletMaterial,
  storeLocalWalletMaterial,
  type LocalWalletMaterial,
} from "@/src/services/wallet/local-wallet-service";

import { submitSignedTransaction } from "@/src/services/api/stellar/horizon-submit";

import { useProposalStore } from "../../state/proposal-store";
import {
  MultisigFlowError,
  classifyEnvelopeOperation,
  proposeOperation,
  recordScannedEnvelope,
  signProposal,
  submitProposal,
} from "../propose-flow";

jest.mock("@/src/services/api/stellar/horizon-submit", () => ({
  submitSignedTransaction: jest.fn(async () => ({ hash: "mock-hash" })),
}));

const OWNER_USER_ID = "user-1";
const PIN_A = "111111";
const PIN_B = "222222";

const buildPaymentXdr = (sourcePublicKey: string): string =>
  new TransactionBuilder(new Account(sourcePublicKey, "0"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        amount: "1",
        asset: Asset.native(),
        destination: sourcePublicKey,
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();

const buildSetOptionsAddSignerXdr = (
  sourcePublicKey: string,
  newSigner: string,
): string =>
  new TransactionBuilder(new Account(sourcePublicKey, "0"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.setOptions({
        signer: { ed25519PublicKey: newSigner, weight: 1 },
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();

/** Signs `xdr` with each material's secret key directly (bypassing LocalSigner/PIN) - for building already-signed fixtures. */
const signWithBoth = (xdr: string, ...materials: LocalWalletMaterial[]): string => {
  const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  if (!(transaction instanceof Transaction)) {
    throw new Error("Expected a Transaction, not a fee-bump envelope");
  }
  for (const material of materials) {
    transaction.sign(Keypair.fromSecret(material.secretKey));
  }
  return transaction.toXDR();
};

beforeEach(() => {
  useProposalStore.setState({ proposals: [] });
  jest.clearAllMocks();
});

describe("classifyEnvelopeOperation", () => {
  it("classifies a single payment operation", () => {
    const source = generateLocalWalletMaterial().publicKey;
    expect(
      classifyEnvelopeOperation(buildPaymentXdr(source), Networks.TESTNET),
    ).toBe("payment");
  });

  it("classifies a single setOptions operation", () => {
    const source = generateLocalWalletMaterial().publicKey;
    const other = generateLocalWalletMaterial().publicKey;
    expect(
      classifyEnvelopeOperation(
        buildSetOptionsAddSignerXdr(source, other),
        Networks.TESTNET,
      ),
    ).toBe("set_options");
  });

  it("rejects a multi-operation transaction", () => {
    const source = generateLocalWalletMaterial().publicKey;
    const xdr = new TransactionBuilder(new Account(source, "0"), {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({ amount: "1", asset: Asset.native(), destination: source }),
      )
      .addOperation(
        Operation.payment({ amount: "1", asset: Asset.native(), destination: source }),
      )
      .setTimeout(30)
      .build()
      .toXDR();

    expect(() => classifyEnvelopeOperation(xdr, Networks.TESTNET)).toThrow(
      MultisigFlowError,
    );
  });

  it("rejects an operation type this app does not build itself", () => {
    const source = generateLocalWalletMaterial().publicKey;
    const xdr = new TransactionBuilder(new Account(source, "0"), {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.bumpSequence({ bumpTo: "1" }))
      .setTimeout(30)
      .build()
      .toXDR();

    expect(() => classifyEnvelopeOperation(xdr, Networks.TESTNET)).toThrow(
      MultisigFlowError,
    );
  });
});

describe("proposeOperation", () => {
  it("submits immediately when the proposer alone already meets the threshold", async () => {
    const materialA = generateLocalWalletMaterial();
    await storeLocalWalletMaterial(materialA, PIN_A);
    const coSigner = generateLocalWalletMaterial().publicKey;

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [{ key: materialA.publicKey, weight: 1 }],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 1 },
    };

    const outcome = await proposeOperation({
      account,
      operationKind: "set_options",
      unsignedXdr: buildSetOptionsAddSignerXdr(materialA.publicKey, coSigner),
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
      pinProvider: async () => PIN_A,
      authorizer: { authorize: async () => {} },
    });

    expect(outcome).toEqual({ status: "submitted", hash: "mock-hash" });
    expect(submitSignedTransaction).toHaveBeenCalledTimes(1);
    expect(useProposalStore.getState().proposals).toHaveLength(0);
  });

  it("stores a collecting proposal when the proposer alone does not meet the threshold", async () => {
    const materialA = generateLocalWalletMaterial();
    await storeLocalWalletMaterial(materialA, PIN_A);
    const materialB = generateLocalWalletMaterial();

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };

    const outcome = await proposeOperation({
      account,
      operationKind: "set_options",
      unsignedXdr: buildSetOptionsAddSignerXdr(
        materialA.publicKey,
        materialB.publicKey,
      ),
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
      pinProvider: async () => PIN_A,
      authorizer: { authorize: async () => {} },
    });

    expect(outcome.status).toBe("collecting");
    expect(submitSignedTransaction).not.toHaveBeenCalled();
    const stored = useProposalStore.getState().proposals;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.status).toBe("collecting");
    expect(stored[0]?.signatures).toEqual([
      { signerKey: materialA.publicKey, signedAt: stored[0]?.createdAt },
    ]);
  });
});

describe("signProposal", () => {
  it("submits once the second co-signer's signature meets the threshold", async () => {
    const materialA = generateLocalWalletMaterial();
    await storeLocalWalletMaterial(materialA, PIN_A);
    const materialB = generateLocalWalletMaterial();
    await storeLocalWalletMaterial(materialB, PIN_B);

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };

    const collecting = await proposeOperation({
      account,
      operationKind: "set_options",
      unsignedXdr: buildSetOptionsAddSignerXdr(
        materialA.publicKey,
        materialB.publicKey,
      ),
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
      pinProvider: async () => PIN_A,
      authorizer: { authorize: async () => {} },
    });
    if (collecting.status !== "collecting") {
      throw new Error("expected the first signature to leave the proposal collecting");
    }

    const outcome = await signProposal({
      account,
      envelopeXdr: collecting.proposal.envelopeXdr,
      operationKind: "set_options",
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
      signerPublicKey: materialB.publicKey,
      pinProvider: async () => PIN_B,
      authorizer: { authorize: async () => {} },
    });

    expect(outcome).toEqual({ status: "submitted", hash: "mock-hash" });
    const stored = useProposalStore
      .getState()
      .proposals.find((proposal) => proposal.id === collecting.proposal.id);
    expect(stored?.status).toBe("submitted");
    expect(stored?.submittedHash).toBe("mock-hash");
  });
});

describe("recordScannedEnvelope", () => {
  it("never submits on its own, even when the scanned envelope already meets threshold", () => {
    const materialA = generateLocalWalletMaterial();
    const materialB = generateLocalWalletMaterial();
    const xdr = buildSetOptionsAddSignerXdr(materialA.publicKey, materialB.publicKey);
    const signedByBoth = signWithBoth(xdr, materialA, materialB);

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };

    const proposal = recordScannedEnvelope({
      account,
      envelopeXdr: signedByBoth,
      operationKind: "set_options",
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
    });

    expect(proposal.status).toBe("ready");
    expect(submitSignedTransaction).not.toHaveBeenCalled();
  });

  it("marks a not-yet-met scanned envelope as collecting", () => {
    const materialA = generateLocalWalletMaterial();
    const materialB = generateLocalWalletMaterial();
    const xdr = buildSetOptionsAddSignerXdr(materialA.publicKey, materialB.publicKey);
    const signedByOne = signWithBoth(xdr, materialA);

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };

    const proposal = recordScannedEnvelope({
      account,
      envelopeXdr: signedByOne,
      operationKind: "set_options",
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
    });

    expect(proposal.status).toBe("collecting");
  });
});

describe("submitProposal", () => {
  it("broadcasts a ready proposal and marks it submitted", async () => {
    const materialA = generateLocalWalletMaterial();
    const materialB = generateLocalWalletMaterial();
    const xdr = buildSetOptionsAddSignerXdr(materialA.publicKey, materialB.publicKey);
    const signedByBoth = signWithBoth(xdr, materialA, materialB);

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };
    const proposal = recordScannedEnvelope({
      account,
      envelopeXdr: signedByBoth,
      operationKind: "set_options",
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
    });

    const { hash } = await submitProposal({ account, proposal });

    expect(hash).toBe("mock-hash");
    const stored = useProposalStore
      .getState()
      .proposals.find((entry) => entry.id === proposal.id);
    expect(stored?.status).toBe("submitted");
  });

  it("throws instead of submitting when the threshold is not actually met", async () => {
    const materialA = generateLocalWalletMaterial();
    const materialB = generateLocalWalletMaterial();
    const xdr = buildSetOptionsAddSignerXdr(materialA.publicKey, materialB.publicKey);
    const signedByOne = signWithBoth(xdr, materialA);

    const account: MultisigAccount = {
      publicKey: materialA.publicKey,
      signers: [
        { key: materialA.publicKey, weight: 1 },
        { key: materialB.publicKey, weight: 1 },
      ],
      thresholds: { masterWeight: 1, low: 1, medium: 1, high: 2 },
    };
    const proposal = recordScannedEnvelope({
      account,
      envelopeXdr: signedByOne,
      operationKind: "set_options",
      networkPassphrase: Networks.TESTNET,
      ownerUserId: OWNER_USER_ID,
    });

    await expect(submitProposal({ account, proposal })).rejects.toThrow(
      MultisigFlowError,
    );
    expect(submitSignedTransaction).not.toHaveBeenCalled();
  });
});
