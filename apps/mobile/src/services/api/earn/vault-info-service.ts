import { Client as VaultClient } from "defindex-vault";

import { getActiveStellarNetwork } from "../stellar/stellar-config";

export interface VaultAssetAllocation {
  asset: string;
  totalAmount: bigint;
}

export interface VaultInfo {
  vaultAddress: string;
  assetAddresses: string[];
  totalManagedFunds: VaultAssetAllocation[];
  totalSupply: bigint;
}

export interface VaultPosition {
  vaultAddress: string;
  shares: bigint;
  /** Current underlying value of `shares`, one entry per vault asset, in the same order as `totalManagedFunds`. */
  underlyingValue: VaultAssetAllocation[];
}

/**
 * Simulates read-only vault queries against a DeFindex-standard vault contract: asset list, total
 * managed funds (TVL per asset), and total share supply. Throws if the Soroban RPC is unavailable
 * or the contract rejects a query (`ContractError`).
 */
export async function fetchVaultInfo(
  vaultAddress: string,
  sourcePublicKey: string
): Promise<VaultInfo> {
  const network = getActiveStellarNetwork();

  if (network.rpcUrl === undefined) {
    throw new Error(`No Soroban RPC configured for network "${network.id}"`);
  }

  const client = new VaultClient({
    contractId: vaultAddress,
    networkPassphrase: network.networkPassphrase,
    publicKey: sourcePublicKey,
    rpcUrl: network.rpcUrl,
  });

  const [assetsTx, managedFundsTx, totalSupplyTx] = await Promise.all([
    client.get_assets(),
    client.fetch_total_managed_funds(),
    client.total_supply(),
  ]);

  const assetAddresses = assetsTx.result.unwrap().map((asset) => asset.address);
  const totalManagedFunds = managedFundsTx.result.unwrap().map((allocation) => ({
    asset: allocation.asset,
    totalAmount: allocation.total_amount,
  }));
  const totalSupply = totalSupplyTx.result;

  return {
    vaultAddress,
    assetAddresses,
    totalManagedFunds,
    totalSupply,
  };
}

/**
 * Simulates read-only queries for a depositor's vault position: share balance and the current
 * underlying value of those shares per vault asset. Throws if the Soroban RPC is unavailable or
 * the contract rejects a query (`ContractError`).
 */
export async function fetchVaultPosition(
  vaultAddress: string,
  depositorAddress: string
): Promise<VaultPosition> {
  const vaultInfo = await fetchVaultInfo(vaultAddress, depositorAddress);

  const network = getActiveStellarNetwork();

  if (network.rpcUrl === undefined) {
    throw new Error(`No Soroban RPC configured for network "${network.id}"`);
  }

  const client = new VaultClient({
    contractId: vaultAddress,
    networkPassphrase: network.networkPassphrase,
    publicKey: depositorAddress,
    rpcUrl: network.rpcUrl,
  });

  const shares = (await client.balance({ id: depositorAddress })).result;

  return {
    vaultAddress,
    shares,
    underlyingValue: convertSharesToUnderlyingValue(
      shares,
      vaultInfo.totalManagedFunds,
      vaultInfo.totalSupply
    ),
  };
}

/**
 * Converts vault shares to their current underlying value per asset:
 * `assetValue = (shares * totalManagedFunds[asset]) / totalSupply`.
 * Returns zero for every asset when `totalSupply` is zero (empty vault, nothing minted yet) -
 * never divide by zero.
 */
export function convertSharesToUnderlyingValue(
  shares: bigint,
  totalManagedFunds: VaultAssetAllocation[],
  totalSupply: bigint
): VaultAssetAllocation[] {
  if (totalSupply === 0n) {
    return totalManagedFunds.map(({ asset }) => ({ asset, totalAmount: 0n }));
  }

  return totalManagedFunds.map(({ asset, totalAmount }) => ({
    asset,
    totalAmount: (shares * totalAmount) / totalSupply,
  }));
}
