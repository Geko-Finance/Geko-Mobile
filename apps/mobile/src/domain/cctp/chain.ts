/**
 * Chains this app can select as the counterpart of a CCTP transfer, and Circle's
 * canonical domain id for each (stable across a chain's mainnet and its testnet -
 * see https://developers.circle.com/cctp/cctp-supported-blockchains). Domain ids are
 * wire values baked into every CCTP message, not infrastructure config, so - unlike
 * RPC/Horizon URLs (src/services/api/stellar/stellar-config.ts) - they live in domain.
 */
export type CctpChainId =
  | "stellar"
  | "ethereum"
  | "avalanche"
  | "optimism"
  | "arbitrum"
  | "base"
  | "polygon";

export interface CctpChain {
  readonly id: CctpChainId;
  /** Circle CCTP domain id. */
  readonly domainId: number;
  readonly displayName: string;
  readonly isStellar: boolean;
}

export const CCTP_CHAINS: Record<CctpChainId, CctpChain> = {
  stellar: { id: "stellar", domainId: 27, displayName: "Stellar", isStellar: true },
  ethereum: { id: "ethereum", domainId: 0, displayName: "Ethereum", isStellar: false },
  avalanche: { id: "avalanche", domainId: 1, displayName: "Avalanche", isStellar: false },
  optimism: { id: "optimism", domainId: 2, displayName: "OP Mainnet", isStellar: false },
  arbitrum: { id: "arbitrum", domainId: 3, displayName: "Arbitrum", isStellar: false },
  base: { id: "base", domainId: 6, displayName: "Base", isStellar: false },
  polygon: { id: "polygon", domainId: 7, displayName: "Polygon PoS", isStellar: false },
};

/** Selectable non-Stellar counterparts, in display order. */
export const REMOTE_CCTP_CHAINS: readonly CctpChain[] = [
  CCTP_CHAINS.ethereum,
  CCTP_CHAINS.avalanche,
  CCTP_CHAINS.base,
  CCTP_CHAINS.arbitrum,
  CCTP_CHAINS.optimism,
  CCTP_CHAINS.polygon,
];

export function getCctpChain(id: CctpChainId): CctpChain {
  return CCTP_CHAINS[id];
}

export function cctpChainByDomainId(domainId: number): CctpChain | undefined {
  return Object.values(CCTP_CHAINS).find((chain) => chain.domainId === domainId);
}
