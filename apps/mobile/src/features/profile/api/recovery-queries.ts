import { useMutation } from "@tanstack/react-query";

import type { WalletAccount } from "@/src/domain/wallet";
import { getCavosClient } from "@/src/services/api/cavos/cavos-client";

/**
 * Approves this device for a custodial wallet by submitting the user-entered
 * recovery code (`POST /wallets/:id/recover-device`). The code is never fetched
 * from the backend — only entered by the user (it was shown once at wallet creation).
 */
export function useRecoverWithCode() {
  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      code: string;
    }): Promise<void> => {
      await getCavosClient().recoverDevice(input.account.id, input.code);
    },
    onError: (error) => {
      console.error("Recover-with-code device approval failed:", error);
    },
  });
}
