import type { StellarNetworkId } from "@/src/domain/wallet";

/**
 * A DeFindex-standard yield vault deployed on Stellar (Neko vaults build on this standard).
 * `id` is the Soroban contract address (`C...`).
 */
export interface Vault {
  readonly id: string;
  readonly name: string;
}

/**
 * Known live vault contracts per Stellar network, confirmed via `get_assets()` against each contract.
 * No on-chain vault discovery/listing yet, this is a minimal registry so the deposit flow has
 * something typed to call today; a real vault service adapter (list vaults, APY, TVL, positions)
 * is the rest of epic #6.
 *
 * Mainnet keeps the two confirmed vault contracts below. Testnet starts empty because no DeFindex
 * vault has been deployed there yet in this repo - add real testnet contract addresses here once
 * available. The Invest tab is expected to show an empty / "no vaults on this network yet" state
 * rather than crash when the active network's list is empty.
 */
export const KNOWN_VAULTS: Record<StellarNetworkId, readonly Vault[]> = {
  mainnet: [
    {
      id: "CCUZC3HC5TH2VCYZFUG57E6IGKPL45YUN2SI3UEYQUBA7RCYHUIZBSFV",
      name: "USDC Autocompound Vault",
    },
    {
      id: "CB3FUMFGCF6DHSFK6N2TOKHRMYXS34HFKQR45UKVORCRUM35AF3ES7WQ",
      name: "EURC Autocompound Vault",
    },
  ],
  testnet: [],
};

/** Returns the known vault list for the given Stellar network. */
export function getKnownVaultsForNetwork(networkId: StellarNetworkId): readonly Vault[] {
  return KNOWN_VAULTS[networkId];
}
