import { useMutation } from "@tanstack/react-query";

import type { WalletSigner } from "@/src/domain/wallet/signer";
import {
  depositToVault,
  type DepositToVaultInput,
  type DepositToVaultResult,
} from "@/src/services/api/earn/defindex-vault-service";

/** Deposits into a DeFindex-standard vault, signed via the given `WalletSigner`. */
export function useDepositToVault() {
  return useMutation<
    DepositToVaultResult,
    Error,
    { input: DepositToVaultInput; signer: WalletSigner }
  >({
    mutationFn: ({ input, signer }) => depositToVault(input, signer),
  });
}
