/**
 * Runtime imports of `@stellar/stellar-sdk` are forbidden in app code: its Horizon
 * module pulls in the Node-only `eventsource` package that Metro cannot resolve.
 * Use type-only imports, `@stellar/typescript-wallet-sdk` (self-contained browser
 * bundle), or locally declared protocol constants instead.
 */
import { Wallet } from "@stellar/typescript-wallet-sdk";

import type { Balance, StellarNetworkId } from "@/src/domain/wallet";

import { ApiError } from "../api-errors";
import { mapHorizonBalances } from "./horizon-mapper";
import {
  STELLAR_NETWORKS,
  createStellarWallet,
  getActiveStellarNetwork,
  type StellarNetworkConfig,
} from "./stellar-config";

/** Read-only Stellar network access scoped to a single network configuration. */
export interface StellarClient {
  readonly network: StellarNetworkConfig;
  fetchAccountBalances(publicKey: string): Promise<Balance[]>;
  accountExists(publicKey: string): Promise<boolean>;
}

const clientCache = new Map<StellarNetworkId, StellarClient>();

const resolveNetworkConfig = (networkId?: StellarNetworkId): StellarNetworkConfig =>
  networkId === undefined ? getActiveStellarNetwork() : STELLAR_NETWORKS[networkId];

/**
 * Extracts an HTTP status code from an error shaped like an Axios error
 * (`error.response.status`), which is how Horizon/wallet-sdk request failures surface
 * regardless of which bundled copy of stellar-sdk threw them (see the `instanceof`
 * caveat below) — exported so other Stellar-adjacent call sites (e.g. submit-transaction
 * error handling) can reuse the same detection instead of re-implementing it.
 */
export const getHttpStatus = (error: unknown): number | undefined => {
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
  const wallet = createStellarWallet(config);

  return {
    network: config,
    async fetchAccountBalances(publicKey: string): Promise<Balance[]> {
      const account = await loadAccount(wallet, publicKey);
      return mapHorizonBalances(account.balances);
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
