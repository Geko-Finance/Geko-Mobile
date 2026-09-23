import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk/base";

import { assertSafeSoroswapTransaction } from "../soroswap-transaction";

const source = Keypair.random();
const contractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

function contractTransaction(options?: {
  fee?: string;
  operationSource?: string;
  source?: string;
}): string {
  const account = new Account(options?.source ?? source.publicKey(), "1");
  return new TransactionBuilder(account, {
    fee: options?.fee ?? BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: "swap",
        args: [nativeToScVal(1, { type: "u32" })],
        ...(options?.operationSource === undefined
          ? {}
          : { source: options.operationSource }),
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();
}

describe("assertSafeSoroswapTransaction", () => {
  it("accepts one unsigned contract invocation from the active wallet", () => {
    expect(() =>
      assertSafeSoroswapTransaction(
        contractTransaction(),
        Networks.TESTNET,
        source.publicKey(),
      ),
    ).not.toThrow();
  });

  it("rejects a transaction sourced from another account", () => {
    expect(() =>
      assertSafeSoroswapTransaction(
        contractTransaction({ source: Keypair.random().publicKey() }),
        Networks.TESTNET,
        source.publicKey(),
      ),
    ).toThrow("source does not match");
  });

  it("rejects non-contract operations", () => {
    const transaction = new TransactionBuilder(new Account(source.publicKey(), "1"), {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: Keypair.random().publicKey(),
          asset: Asset.native(),
          amount: "1",
        }),
      )
      .setTimeout(30)
      .build()
      .toXDR();

    expect(() =>
      assertSafeSoroswapTransaction(
        transaction,
        Networks.TESTNET,
        source.publicKey(),
      ),
    ).toThrow("unsupported operation");
  });

  it("rejects excessive network fees", () => {
    expect(() =>
      assertSafeSoroswapTransaction(
        contractTransaction({ fee: "100000001" }),
        Networks.TESTNET,
        source.publicKey(),
      ),
    ).toThrow("fee exceeds");
  });
});
