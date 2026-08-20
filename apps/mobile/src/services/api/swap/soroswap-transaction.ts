import {
  FeeBumpTransaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk/base";

const MAX_SWAP_FEE_STROOPS = 100_000_000n;

/** Validates the untrusted aggregator envelope before it reaches any wallet signer. */
export function assertSafeSoroswapTransaction(
  transactionXdr: string,
  networkPassphrase: string,
  expectedSource: string,
): void {
  let transaction: ReturnType<typeof TransactionBuilder.fromXDR>;

  try {
    transaction = TransactionBuilder.fromXDR(
      transactionXdr,
      networkPassphrase,
    );
  } catch {
    throw new Error("Soroswap returned an invalid transaction envelope");
  }

  if (transaction instanceof FeeBumpTransaction) {
    throw new Error("Soroswap fee-bump transactions are not supported");
  }

  if (transaction.source !== expectedSource) {
    throw new Error("Soroswap transaction source does not match this wallet");
  }

  if (transaction.signatures.length !== 0) {
    throw new Error("Soroswap transaction must be unsigned");
  }

  if (BigInt(transaction.fee) > MAX_SWAP_FEE_STROOPS) {
    throw new Error("Soroswap transaction fee exceeds the safety limit");
  }

  if (transaction.operations.length !== 1) {
    throw new Error("Soroswap transaction must contain one operation");
  }

  const operation = transaction.operations[0]!;

  if (operation.type !== "invokeHostFunction") {
    throw new Error("Soroswap transaction contains an unsupported operation");
  }

  if (operation.source !== undefined && operation.source !== expectedSource) {
    throw new Error("Soroswap operation source does not match this wallet");
  }
}
