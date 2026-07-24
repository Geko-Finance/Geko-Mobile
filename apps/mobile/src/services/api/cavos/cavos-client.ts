import { appConfig } from "@/src/config/env";

import {
  CavosProviderUnavailableError,
  CavosSessionExpiredError,
} from "./cavos-errors";
import type {
  CavosExecuteResult,
  CavosIdentity,
  CavosSession,
} from "./cavos-types";

/**
 * Internal Cavos wallet-as-a-service port scoped to this MVP.
 * The real `@cavos/kit` SDK runs server-side in server/; this file is an HTTP
 * client to that service, keeping the same port interface for callers.
 */
export interface CavosClient {
  connect(identity: CavosIdentity): Promise<CavosSession>;
  execute(
    session: CavosSession,
    amountStroops: bigint,
    destinationPublicKey: string
  ): Promise<CavosExecuteResult>;
  signXdr(
    session: CavosSession,
    unsignedXdr: string
  ): Promise<{ signedXdr: string }>;
  addTrustline(
    session: CavosSession,
    code: string,
    issuer: string
  ): Promise<{ hash: string }>;
  getRecoveryCode(session: CavosSession): Promise<string | null>;
  recoverWithCode(identity: CavosIdentity, code: string): Promise<CavosSession>;
  getBalance(session: CavosSession): Promise<bigint>;
}

const cavosApiUrl = (path: string): string =>
  `${appConfig.cavosBackendUrl}${path}`;

const createRealCavosClient = (): CavosClient => ({
  async connect(identity: CavosIdentity): Promise<CavosSession> {
    const response = await fetch(cavosApiUrl("/api/cavos/connect"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: identity.userId,
        email: identity.email,
      }),
    });

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos connect failed (${response.status})`
      );
    }

    const { address, status } = (await response.json()) as {
      address: string;
      status: CavosSession["status"];
    };

    return { address, status, userId: identity.userId };
  },

  async execute(
    session: CavosSession,
    amountStroops: bigint,
    destinationPublicKey: string
  ): Promise<CavosExecuteResult> {
    const response = await fetch(cavosApiUrl("/api/cavos/execute"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.userId,
        amountStroops: amountStroops.toString(),
        destination: destinationPublicKey,
      }),
    });

    if (response.status === 409) {
      throw new CavosSessionExpiredError(
        "Cavos session is no longer valid; reconnect to continue"
      );
    }

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos execute failed (${response.status})`
      );
    }

    const { hash } = (await response.json()) as { hash: string };
    return { hash };
  },

  async signXdr(
    session: CavosSession,
    unsignedXdr: string
  ): Promise<{ signedXdr: string }> {
    const response = await fetch(cavosApiUrl("/api/cavos/sign"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.userId,
        unsignedXdr,
      }),
    });

    if (response.status === 409) {
      throw new CavosSessionExpiredError(
        "Cavos session is no longer valid; reconnect to continue"
      );
    }

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos sign failed (${response.status})`
      );
    }

    const { signedXdr } = (await response.json()) as { signedXdr: string };
    return { signedXdr };
  },

  async addTrustline(
    session: CavosSession,
    code: string,
    issuer: string
  ): Promise<{ hash: string }> {
    const response = await fetch(cavosApiUrl("/api/cavos/trustline"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.userId,
        code,
        issuer,
      }),
    });

    if (response.status === 409) {
      throw new CavosSessionExpiredError(
        "Cavos session is no longer valid; reconnect to continue"
      );
    }

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos trustline failed (${response.status})`
      );
    }

    const { hash } = (await response.json()) as { hash: string };
    return { hash };
  },

  async getRecoveryCode(session: CavosSession): Promise<string | null> {
    const response = await fetch(
      cavosApiUrl(
        `/api/cavos/recovery-code?userId=${encodeURIComponent(session.userId)}`
      )
    );

    if (response.status === 404) {
      return null;
    }

    if (response.status === 409) {
      throw new CavosSessionExpiredError(
        "Cavos session is no longer valid; reconnect to continue"
      );
    }

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos recovery-code fetch failed (${response.status})`
      );
    }

    const { code } = (await response.json()) as { code: string };
    return code;
  },

  async recoverWithCode(
    identity: CavosIdentity,
    code: string
  ): Promise<CavosSession> {
    const response = await fetch(cavosApiUrl("/api/cavos/recover-device"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: identity.userId,
        code,
      }),
    });

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos device recovery failed (${response.status})`
      );
    }

    const { address, status } = (await response.json()) as {
      address: string;
      status: CavosSession["status"];
    };

    return { address, status, userId: identity.userId };
  },

  async getBalance(session: CavosSession): Promise<bigint> {
    const response = await fetch(
      cavosApiUrl(
        `/api/cavos/balance?userId=${encodeURIComponent(session.userId)}`
      )
    );

    if (response.status === 409) {
      throw new CavosSessionExpiredError(
        "Cavos session is no longer valid; reconnect to continue"
      );
    }

    if (!response.ok) {
      throw new CavosProviderUnavailableError(
        `Cavos balance failed (${response.status})`
      );
    }

    const { stroops } = (await response.json()) as { stroops: string };
    return BigInt(stroops);
  },
});

let cavosClient: CavosClient | undefined;

/** Returns the singleton Cavos client backed by the local Cavos backend service (server/) over HTTP. */
export function getCavosClient(): CavosClient {
  if (cavosClient === undefined) {
    cavosClient = createRealCavosClient();
  }

  return cavosClient;
}
