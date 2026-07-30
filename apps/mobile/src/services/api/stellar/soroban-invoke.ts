/**
 * Generic "build, simulate, sign, submit, await result" for a single Soroban contract
 * invocation with no generated bindings - the same shape defindex-vault-service.ts
 * gets for free from the generated `defindex-vault` Client, hand-rolled for contracts
 * this repo has no codegen for (CCTP's TokenMessengerMinter / MessageTransmitter).
 * Building blocks (`Contract`, `Address`, XDR helpers) come from `@stellar/stellar-base`,
 * which is safe to import at runtime; the RPC server comes from the `no-eventsource`
 * submodule of `@stellar/stellar-sdk`, exactly as defindex-vault's own index.ts does -
 * see stellar-client.ts's doc comment for why the plain `@stellar/stellar-sdk` import is
 * forbidden (its Horizon module drags in Node-only `eventsource`).
 */
import {
  Account,
  BASE_FEE,
  Contract,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-base";
import { Api as SorobanRpcApi, Server as SorobanRpcServer } from "@stellar/stellar-sdk/no-eventsource/rpc";

import type { WalletSigner } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export interface InvokeSorobanContractInput {
  readonly contractId: string;
  readonly method: string;
  readonly args: xdr.ScVal[];
  readonly sourcePublicKey: string;
  readonly rpcUrl: string;
  readonly networkPassphrase: string;
  readonly signer: WalletSigner;
}

export interface InvokeSorobanContractResult {
  readonly hash: string;
  readonly returnValue: unknown;
}

/** Builds, simulates (for resource fees/footprint), signs via `signer`, submits, and awaits confirmation of a single contract call. */
export async function invokeSorobanContract(
  input: InvokeSorobanContractInput
): Promise<InvokeSorobanContractResult> {
  const server = new SorobanRpcServer(input.rpcUrl);
  const sourceAccount: Account = await server.getAccount(input.sourcePublicKey);
  const contract = new Contract(input.contractId);

  const unpreparedTransaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: input.networkPassphrase,
  })
    .addOperation(contract.call(input.method, ...input.args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(unpreparedTransaction);
  const { xdr: signedXdr } = await input.signer.signTransaction(prepared.toXDR(), {
    networkPassphrase: input.networkPassphrase,
  });
  const signedTransaction = TransactionBuilder.fromXDR(signedXdr, input.networkPassphrase);

  if (!(signedTransaction instanceof Transaction)) {
    throw new ApiError("Fee-bump envelopes are not supported for Soroban invocations", 400);
  }

  const sendResult = await server.sendTransaction(signedTransaction);

  if (sendResult.status === "ERROR") {
    throw new ApiError(
      `Soroban transaction submission was rejected: ${input.method}`,
      502
    );
  }

  const returnValue = await pollForResult(server, sendResult.hash);

  return { hash: sendResult.hash, returnValue };
}

async function pollForResult(
  server: SorobanRpcServer,
  hash: string
): Promise<unknown> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await server.getTransaction(hash);

    if (response.status === SorobanRpcApi.GetTransactionStatus.SUCCESS) {
      return response.returnValue !== undefined
        ? scValToNative(response.returnValue)
        : undefined;
    }

    if (response.status === SorobanRpcApi.GetTransactionStatus.FAILED) {
      throw new ApiError(`Soroban transaction failed on-chain: ${hash}`, 502);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new ApiError(`Timed out waiting for Soroban transaction ${hash}`, 504);
}
