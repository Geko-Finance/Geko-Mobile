import { apiRequest } from "@/src/services/api/api-client";
import { ApiError } from "@/src/services/api/api-errors";

import {
  CavosProviderUnavailableError,
  CavosSessionExpiredError,
} from "./cavos-errors";
import type {
  BackendCustodialWallet,
  CavosExecuteResult,
} from "./cavos-types";

/**
 * HTTP client for the JWT-guarded Wallets API (custodial Cavos wallets).
 * Wallet identity is a stable backend-issued uuid (`wallet.id`), distinct from
 * the Stellar `publicAddress`. Auth is resolved server-side from the Bearer
 * token — never pass a userId in the body.
 */
export interface CavosClient {
  createWallet(): Promise<{
    wallet: BackendCustodialWallet;
    revealOnce?: { recoveryCode?: string };
  }>;
  getWallet(walletId: string): Promise<BackendCustodialWallet>;
  execute(
    walletId: string,
    amountStroops: bigint,
    destination: string
  ): Promise<CavosExecuteResult>;
  signXdr(
    walletId: string,
    unsignedXdr: string
  ): Promise<{ signedXdr: string }>;
  addTrustline(
    walletId: string,
    code: string,
    issuer: string
  ): Promise<{ hash: string }>;
  recoverDevice(
    walletId: string,
    code: string
  ): Promise<{ status: "ready" }>;
  getBalance(walletId: string): Promise<bigint>;
}

/** Maps a 409 (needs device approval) to CavosSessionExpiredError; other failures to provider unavailable. */
function mapWalletOpError(error: unknown, operation: string): never {
  if (error instanceof ApiError && error.status === 409) {
    throw new CavosSessionExpiredError(
      "Cavos session is no longer valid; reconnect to continue"
    );
  }

  throw new CavosProviderUnavailableError(
    `Cavos ${operation} failed (${
      error instanceof ApiError ? error.status : "unknown"
    })`
  );
}

const createRealCavosClient = (): CavosClient => ({
  async createWallet() {
    try {
      return await apiRequest<{
        wallet: BackendCustodialWallet;
        revealOnce?: { recoveryCode?: string };
      }>("/wallets", {
        method: "POST",
        body: { custodyType: "cavos_custodial" },
        requiresAuth: true,
      });
    } catch (error) {
      throw new CavosProviderUnavailableError(
        `Cavos createWallet failed (${
          error instanceof ApiError ? error.status : "unknown"
        })`
      );
    }
  },

  async getWallet(walletId: string): Promise<BackendCustodialWallet> {
    try {
      return await apiRequest<BackendCustodialWallet>(`/wallets/${walletId}`, {
        requiresAuth: true,
      });
    } catch (error) {
      throw new CavosProviderUnavailableError(
        `Cavos getWallet failed (${
          error instanceof ApiError ? error.status : "unknown"
        })`
      );
    }
  },

  async execute(
    walletId: string,
    amountStroops: bigint,
    destination: string
  ): Promise<CavosExecuteResult> {
    try {
      return await apiRequest<CavosExecuteResult>(
        `/wallets/${walletId}/execute`,
        {
          method: "POST",
          body: {
            amountStroops: amountStroops.toString(),
            destination,
          },
          requiresAuth: true,
        }
      );
    } catch (error) {
      mapWalletOpError(error, "execute");
    }
  },

  async signXdr(
    walletId: string,
    unsignedXdr: string
  ): Promise<{ signedXdr: string }> {
    try {
      return await apiRequest<{ signedXdr: string }>(
        `/wallets/${walletId}/sign`,
        {
          method: "POST",
          body: { unsignedXdr },
          requiresAuth: true,
        }
      );
    } catch (error) {
      mapWalletOpError(error, "sign");
    }
  },

  async addTrustline(
    walletId: string,
    code: string,
    issuer: string
  ): Promise<{ hash: string }> {
    try {
      return await apiRequest<{ hash: string }>(
        `/wallets/${walletId}/trustline`,
        {
          method: "POST",
          body: { code, issuer },
          requiresAuth: true,
        }
      );
    } catch (error) {
      mapWalletOpError(error, "trustline");
    }
  },

  async recoverDevice(
    walletId: string,
    code: string
  ): Promise<{ status: "ready" }> {
    try {
      return await apiRequest<{ status: "ready" }>(
        `/wallets/${walletId}/recover-device`,
        {
          method: "POST",
          body: { recoveryCode: code },
          requiresAuth: true,
        }
      );
    } catch (error) {
      throw new CavosProviderUnavailableError(
        `Cavos device recovery failed (${
          error instanceof ApiError ? error.status : "unknown"
        })`
      );
    }
  },

  async getBalance(walletId: string): Promise<bigint> {
    try {
      const { stroops } = await apiRequest<{ stroops: string }>(
        `/wallets/${walletId}/balance`,
        { requiresAuth: true }
      );
      return BigInt(stroops);
    } catch (error) {
      mapWalletOpError(error, "balance");
    }
  },
});

let cavosClient: CavosClient | undefined;

/** Returns the singleton Cavos Wallets API client (JWT via apiRequest). */
export function getCavosClient(): CavosClient {
  if (cavosClient === undefined) {
    cavosClient = createRealCavosClient();
  }

  return cavosClient;
}
