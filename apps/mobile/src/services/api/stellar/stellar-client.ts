/**
 * Runtime imports of the root `@stellar/stellar-sdk` entry point are forbidden in app
 * code: its Horizon module pulls in the Node-only `eventsource` package that Metro
 * cannot resolve. Use type-only imports from the root, or runtime imports from the
 * `base`, `contract` and `rpc` submodules, which carry no Horizon dependency.
 * `@stellar/typescript-wallet-sdk` (self-contained browser bundle) and locally declared
 * protocol constants are the other safe options.
 *
 * SDK 16 absorbed `@stellar/stellar-base` into `@stellar/stellar-sdk/base` and dropped
 * the old `minimal`/`no-axios`/`no-eventsource` build variants; those submodules are the
 * replacement.
 */
import type { Networks } from "@stellar/stellar-sdk";
import { StellarConfiguration, Wallet } from "@stellar/typescript-wallet-sdk";

import type { MultisigAccount } from "@/src/domain/multisig";
import type { Balance, StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import { mapHorizonBalances } from "./horizon-mapper";
import { mapHorizonAccountToMultisigAccount } from "./multisig-mapper";
import {
  STELLAR_NETWORKS,
  getActiveStellarNetwork,
  type StellarNetworkConfig,
} from "./stellar-config";

/** Read-only Stellar network access scoped to a single network configuration. */
export interface StellarClient {
  readonly network: StellarNetworkConfig;
  fetchAccountBalances(publicKey: string): Promise<Balance[]>;
  fetchMultisigAccount(publicKey: string): Promise<MultisigAccount>;
  accountExists(publicKey: string): Promise<boolean>;
}

const clientCache = new Map<StellarNetworkId, StellarClient>();

const resolveNetworkConfig = (networkId?: StellarNetworkId): StellarNetworkConfig =>
  networkId === undefined ? getActiveStellarNetwork() : STELLAR_NETWORKS[networkId];

const createWallet = (config: StellarNetworkConfig): Wallet => {
  const stellarConfiguration = new StellarConfiguration({
    network: config.networkPassphrase as Networks,
    horizonUrl: config.horizonUrl,
  });

  return new Wallet({ stellarConfiguration });
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status ===
      "number"
  ) {
    return (error as { response: { status: number } }).response.status;
  }

  return undefined;
};

/** Wallet-sdk errors come from its own bundled stellar-sdk copy, so instanceof checks never match; HTTP status is reliable. */
const isHorizonNotFoundError = (error: unknown): boolean =>
  getHttpStatus(error) === 404;

const toAccountNotFoundError = (): ApiError =>
  new ApiError("Account not found on the Stellar network", 404);

const toStellarRequestError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(
    "Stellar network request failed",
    getHttpStatus(error) ?? 500
  );
};

const loadAccount = async (wallet: Wallet, publicKey: string) => {
  try {
    return await wallet.stellar().account().getInfo({ accountAddress: publicKey });
  } catch (error) {
    if (isHorizonNotFoundError(error)) {
      throw toAccountNotFoundError();
    }

    throw toStellarRequestError(error);
  }
};

const createStellarClient = (config: StellarNetworkConfig): StellarClient => {
  const wallet = createWallet(config);

  return {
    network: config,
    async fetchAccountBalances(publicKey: string): Promise<Balance[]> {
      const account = await loadAccount(wallet, publicKey);
      return mapHorizonBalances(account.balances);
    },
    async fetchMultisigAccount(publicKey: string): Promise<MultisigAccount> {
      const account = await loadAccount(wallet, publicKey);
      return mapHorizonAccountToMultisigAccount(account);
    },
    async accountExists(publicKey: string): Promise<boolean> {
      try {
        await loadAccount(wallet, publicKey);
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return false;
        }

        throw error;
      }
    },
  };
};

/** Returns a cached Stellar client for the given network (defaults to the active app network). */
export function getStellarClient(networkId?: StellarNetworkId): StellarClient {
  const resolvedNetworkId = networkId ?? getActiveStellarNetwork().id;
  const cachedClient = clientCache.get(resolvedNetworkId);

  if (cachedClient) {
    return cachedClient;
  }

  const client = createStellarClient(resolveNetworkConfig(resolvedNetworkId));
  clientCache.set(resolvedNetworkId, client);
  return client;
}

/** Whether an error represents an unfunded or missing Stellar account. */
export function isAccountNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
