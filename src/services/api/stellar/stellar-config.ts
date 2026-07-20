import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

/**
 * Canonical, immutable Stellar protocol identifiers (identical values to
 * stellar-sdk's `Networks.TESTNET` / `Networks.PUBLIC`), declared locally
 * because runtime imports of `@stellar/stellar-sdk` are forbidden in the app
 * bundle (the Horizon module drags in Node-only eventsource; see stellar-client.ts).
 */
const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const PUBLIC_NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/** Resolved Stellar network endpoints and passphrases for the active app environment. */
export interface StellarNetworkConfig {
  /** App-level network identifier (`testnet` or `mainnet`). */
  readonly id: StellarNetworkId;
  /** Horizon REST API base URL for this network. */
  readonly horizonUrl: string;
  /** Network passphrase used when signing and validating transactions. */
  readonly networkPassphrase: string;
  /** Friendbot funding endpoint; available on testnet only. */
  readonly friendbotUrl?: string;
  /** Soroban RPC URL for testnet; on mainnet the Soroban RPC is provider-specific and set when a provider is selected. */
  readonly rpcUrl?: string;
}

/** Known Stellar network configurations keyed by app network id. */
export const STELLAR_NETWORKS: Record<StellarNetworkId, StellarNetworkConfig> = {
  testnet: {
    id: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
    friendbotUrl: "https://friendbot.stellar.org",
    rpcUrl: "https://soroban-testnet.stellar.org",
  },
  mainnet: {
    id: "mainnet",
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: PUBLIC_NETWORK_PASSPHRASE,
  },
};

/** Returns the Stellar network configuration for the current app build. */
export function getActiveStellarNetwork(): StellarNetworkConfig {
  return STELLAR_NETWORKS[appConfig.stellarNetwork];
}
