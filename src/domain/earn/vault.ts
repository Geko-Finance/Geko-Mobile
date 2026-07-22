/**
 * A DeFindex-standard yield vault deployed on Stellar (Neko vaults build on this standard).
 * `id` is the Soroban contract address (`C...`).
 */
export interface Vault {
  readonly id: string;
  readonly name: string;
}

/**
 * Known live vault contracts (mainnet). No on-chain vault discovery/listing yet — this is a
 * minimal registry so the deposit flow has something typed to call today; a real vault
 * service adapter (list vaults, APY, TVL, positions) is the rest of epic #6.
 */
export const KNOWN_VAULTS: readonly Vault[] = [
  {
    id: "CCUZC3HC5TH2VCYZFUG57E6IGKPL45YUN2SI3UEYQUBA7RCYHUIZBSFV",
    name: "Vault 1",
  },
  {
    id: "CB3FUMFGCF6DHSFK6N2TOKHRMYXS34HFKQR45UKVORCRUM35AF3ES7WQ",
    name: "Vault 2",
  },
];
