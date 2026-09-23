import { getCctpChain, type CctpChainId } from "@/src/domain/cctp";
import type { StellarNetworkId } from "@/src/domain/wallet";

/** Block-explorer links, so users can check a transaction outside the app. */

export function stellarTxUrl(networkId: StellarNetworkId, hash: string): string {
  const network = networkId === "mainnet" ? "public" : "testnet";

  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

interface RemoteChainExplorer {
  readonly mainnet: { readonly name: string; readonly explorer: string };
  readonly testnet: { readonly name: string; readonly explorer: string };
}

// The app's testnet mode pairs Stellar testnet with each chain's CCTP testnet.
const REMOTE_EXPLORERS: Record<Exclude<CctpChainId, "stellar">, RemoteChainExplorer> = {
  ethereum: {
    mainnet: { name: "Ethereum", explorer: "https://etherscan.io" },
    testnet: { name: "Ethereum Sepolia", explorer: "https://sepolia.etherscan.io" },
  },
  base: {
    mainnet: { name: "Base", explorer: "https://basescan.org" },
    testnet: { name: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
  },
  avalanche: {
    mainnet: { name: "Avalanche", explorer: "https://snowtrace.io" },
    testnet: { name: "Avalanche Fuji", explorer: "https://testnet.snowtrace.io" },
  },
  optimism: {
    mainnet: { name: "OP Mainnet", explorer: "https://optimistic.etherscan.io" },
    testnet: { name: "OP Sepolia", explorer: "https://sepolia-optimism.etherscan.io" },
  },
  arbitrum: {
    mainnet: { name: "Arbitrum", explorer: "https://arbiscan.io" },
    testnet: { name: "Arbitrum Sepolia", explorer: "https://sepolia.arbiscan.io" },
  },
  polygon: {
    mainnet: { name: "Polygon PoS", explorer: "https://polygonscan.com" },
    testnet: { name: "Polygon Amoy", explorer: "https://amoy.polygonscan.com" },
  },
};

export function cctpChainTxUrl(
  chainId: CctpChainId,
  networkId: StellarNetworkId,
  hash: string
): string {
  if (chainId === "stellar") {
    return stellarTxUrl(networkId, hash);
  }

  return `${REMOTE_EXPLORERS[chainId][networkId].explorer}/tx/${hash}`;
}

/** Chain name as the user sees it in their wallet - on testnet, the actual testnet (e.g. "Ethereum Sepolia"). */
export function cctpChainDisplayName(chainId: CctpChainId, networkId: StellarNetworkId): string {
  if (chainId === "stellar") {
    return getCctpChain("stellar").displayName;
  }

  return REMOTE_EXPLORERS[chainId][networkId].name;
}
