// Same XDR/tx primitives as stellar-sdk without the Node-only eventsource dependency that breaks Metro.
import {
  FeeBumpTransaction,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";

import type {
  SignTransactionOptions,
  WalletSigner,
} from "@/src/domain/wallet";

import type { CavosClient } from "./cavos-client";
import { getCavosClient } from "./cavos-client";
import {
  CavosProviderUnavailableError,
  CavosSessionExpiredError,
  CavosUnsupportedOperationError,
} from "./cavos-errors";
import type { CavosSession } from "./cavos-types";

const STROOPS_PER_XLM = 10_000_000n;

const assertSessionReady = (session: CavosSession): void => {
  if (session.status !== "ready") {
    throw new CavosSessionExpiredError(
      "Cavos session is no longer valid; reconnect to continue",
    );
  }
};

const xlmAmountToStroops = (amount: string): bigint => {
  const [whole = "0", fraction = ""] = amount.split(".");
  const paddedFraction = `${fraction}0000000`.slice(0, 7);

  return BigInt(whole) * STROOPS_PER_XLM + BigInt(paddedFraction);
};

const parseNativePayment = (
  transactionXdr: string,
  networkPassphrase: string,
): { amountStroops: bigint; destination: string } => {
  let parsed: ReturnType<typeof TransactionBuilder.fromXDR>;

  try {
    parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
  } catch {
    throw new CavosUnsupportedOperationError(
      "unsupported or invalid transaction envelope",
    );
  }

  if (parsed instanceof FeeBumpTransaction) {
    throw new CavosUnsupportedOperationError(
      "fee bump transactions are unsupported",
    );
  }

  const { operations } = parsed;

  if (operations.length === 0) {
    throw new CavosUnsupportedOperationError("transaction has no operations");
  }

  if (operations.length > 1) {
    throw new CavosUnsupportedOperationError(
      "transaction has multiple operations",
    );
  }

  const operation = operations[0]!;

  if (operation.type !== "payment") {
    throw new CavosUnsupportedOperationError(
      `unsupported operation type: ${operation.type}`,
    );
  }

  const payment = operation as Operation.Payment;

  if (!payment.destination) {
    throw new CavosUnsupportedOperationError("payment missing destination");
  }

  if (!payment.asset.isNative()) {
    throw new CavosUnsupportedOperationError("non-native asset payment");
  }

  return {
    amountStroops: xlmAmountToStroops(payment.amount),
    destination: payment.destination,
  };
};

export class CavosSigner implements WalletSigner {
  readonly custody = "custodial" as const;

  private readonly session: CavosSession;
  private readonly client: CavosClient;

  constructor(session: CavosSession, client: CavosClient = getCavosClient()) {
    this.session = session;
    this.client = client;
  }

  async getAddress(): Promise<string> {
    assertSessionReady(this.session);
    return this.session.address;
  }

  async getPublicKey(): Promise<string> {
    assertSessionReady(this.session);
    return this.session.address;
  }

  /**
   * IMPORTANT — Cavos custody divergence from the generic `WalletSigner` contract:
   *
   * Unlike a typical `WalletSigner.signTransaction`, this implementation submits the
   * transaction to the network as a side effect of "signing" it. Cavos's SDK exposes only
   * an atomic sign-and-submit `execute()` primitive — there is no raw sign-only XDR API.
   *
   * The returned XDR is the original **unsigned** input, returned solely to satisfy the
   * `WalletSigner` type contract. Callers and consumers of a custodial `WalletSigner` MUST
   * NOT submit the returned XDR to Horizon themselves — submission has already occurred
   * inside this call.
   *
   * Any code that follows a generic sign-then-submit flow MUST branch on
   * `signer.custody === "custodial"` and skip its own submit step.
   */
  async signTransaction(
    transactionXdr: string,
    options: SignTransactionOptions,
  ): Promise<string> {
    assertSessionReady(this.session);

    const { amountStroops, destination } = parseNativePayment(
      transactionXdr,
      options.networkPassphrase,
    );

    try {
      await this.client.execute(this.session, amountStroops, destination);
    } catch {
      throw new CavosProviderUnavailableError("Cavos provider is unavailable");
    }

    return transactionXdr;
  }
}
