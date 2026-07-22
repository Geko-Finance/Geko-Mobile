import { useMutation } from "@tanstack/react-query";

import type { WalletAccount } from "@/src/domain/wallet";
import { CavosSessionExpiredError } from "@/src/services/api/cavos/cavos-errors";
import { getCavosClient } from "@/src/services/api/cavos/cavos-client";
import {
  getStoredCavosSession,
  setStoredCavosSession,
} from "@/src/services/api/cavos/cavos-session-storage";

export function useViewRecoveryCode() {
  return useMutation({
    mutationFn: async (account: WalletAccount): Promise<string | null> => {
      const session = await getStoredCavosSession();

      if (session === null || session.address !== account.publicKey) {
        throw new CavosSessionExpiredError(
          "No active Cavos session for this account; reconnect to continue",
        );
      }

      return getCavosClient().getRecoveryCode(session);
    },
  });
}

export function useRecoverWithCode() {
  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      code: string;
    }): Promise<void> => {
      const storedSession = await getStoredCavosSession();

      if (
        storedSession === null ||
        storedSession.address !== input.account.publicKey
      ) {
        throw new CavosSessionExpiredError(
          "No active Cavos session for this account; reconnect to continue",
        );
      }

      const session = await getCavosClient().recoverWithCode(
        { userId: storedSession.userId, email: undefined },
        input.code,
      );

      await setStoredCavosSession(session);
    },
    onError: (error) => {
      console.error("Recover-with-code device approval failed:", error);
    },
  });
}
