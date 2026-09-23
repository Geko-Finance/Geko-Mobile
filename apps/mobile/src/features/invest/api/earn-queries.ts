import { useMutation, useQuery } from "@tanstack/react-query";

import { getKnownVaultsForNetwork, type Vault } from "@/src/domain/earn/vault";
import type { StellarNetworkId } from "@/src/domain/wallet";
import type { WalletSigner } from "@/src/domain/wallet/signer";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import {
  depositToVault,
  type DepositToVaultInput,
  type DepositToVaultResult,
  withdrawFromVault,
  type WithdrawFromVaultInput,
  type WithdrawFromVaultResult,
} from "@/src/services/api/earn/defindex-vault-service";
import {
  fetchVaultInfo,
  fetchVaultPosition,
  type VaultInfo,
  type VaultPosition,
} from "@/src/services/api/earn/vault-info-service";

/** TanStack Query key factory for earn queries. */
export const earnKeys = {
  all: ["earn"] as const,
  vaults: (networkId: StellarNetworkId) => [...earnKeys.all, "vaults", networkId] as const,
  vaultPosition: (vaultAddress: string, depositorAddress: string) =>
    [...earnKeys.all, "position", vaultAddress, depositorAddress] as const,
};

export interface VaultWithInfo extends Vault {
  info: VaultInfo;
}

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

/** Fetches known vaults for the active network, enriched with on-chain vault info. */
export function useVaults(sourcePublicKey: string | undefined) {
  const networkId = useActiveNetworkId();
  const knownVaults = getKnownVaultsForNetwork(networkId);

  return useQuery<VaultWithInfo[], Error>({
    enabled: sourcePublicKey !== undefined && knownVaults.length > 0,
    queryFn: () =>
      Promise.all(
        knownVaults.map((vault) =>
          fetchVaultInfo(vault.id, sourcePublicKey!).then((info) => ({ ...vault, info }))
        )
      ),
    queryKey: earnKeys.vaults(networkId),
  });
}

/** Fetches a depositor's share balance and underlying value for a vault. */
export function useVaultPosition(
  vaultAddress: string | undefined,
  depositorAddress: string | undefined
) {
  return useQuery<VaultPosition, Error>({
    enabled: vaultAddress !== undefined && depositorAddress !== undefined,
    queryFn: () => fetchVaultPosition(vaultAddress!, depositorAddress!),
    queryKey: earnKeys.vaultPosition(vaultAddress ?? "none", depositorAddress ?? "none"),
  });
}

/** Withdraws from a DeFindex-standard vault, signed via the given `WalletSigner`. */
export function useWithdrawFromVault() {
  return useMutation<
    WithdrawFromVaultResult,
    Error,
    { input: WithdrawFromVaultInput; signer: WalletSigner }
  >({
    mutationFn: ({ input, signer }) => withdrawFromVault(input, signer),
  });
}
