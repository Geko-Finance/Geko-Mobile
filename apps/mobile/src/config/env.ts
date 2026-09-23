import Constants from "expo-constants";

import type { StellarNetworkId } from "@/src/domain/wallet";

type AppEnvironment = "development" | "preview" | "production";

interface AppConfig {
  backendUrl: string;
  cavosAppId: string;
  cavosAppSalt: string;
  /** Circle's USDC issuer (G...) on Stellar testnet - see src/services/api/cctp/cctp-config.ts. */
  cctpUsdcIssuerTestnet: string;
  /** Circle's USDC issuer (G...) on Stellar mainnet - see src/services/api/cctp/cctp-config.ts. */
  cctpUsdcIssuerMainnet: string;
  stellarTestnetRpcUrl: string;
  stellarMainnetRpcUrl: string;
  environment: AppEnvironment;
  requestTimeoutMs: number;
  stellarNetwork: StellarNetworkId;
}

/**
 * Circle's official USDC issuer accounts on Stellar - confirmed against Circle's own
 * contract-address reference (https://developers.circle.com/stablecoins/usdc-contract-addresses),
 * fetched twice independently. Used as defaults below; overridable per-build via env
 * in case Circle ever rotates an issuer.
 */
const DEFAULT_CCTP_USDC_ISSUER_TESTNET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const DEFAULT_CCTP_USDC_ISSUER_MAINNET = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

/** Public Soroban RPC endpoints (see apps/mobile/src/services/api/stellar/stellar-config.ts for
 * where these are consumed). The mainnet one is a shared/rate-limited public provider - swap for
 * a dedicated one via EXPO_PUBLIC_STELLAR_MAINNET_RPC_URL before real mainnet traffic. */
const DEFAULT_STELLAR_TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_STELLAR_MAINNET_RPC_URL = "https://mainnet.sorobanrpc.com";

const extra = Constants.expoConfig?.extra ?? {};

const toEnvironment = (value: unknown): AppEnvironment => {
  if (value === "preview" || value === "production") {
    return value;
  }

  return "development";
};

const toStellarNetwork = (value: unknown): StellarNetworkId => {
  if (value === "mainnet") {
    return value;
  }

  return "testnet";
};

export const appConfig: AppConfig = {
  backendUrl:
    typeof process.env.EXPO_PUBLIC_BACKEND_URL === "string" &&
    process.env.EXPO_PUBLIC_BACKEND_URL.length > 0
      ? process.env.EXPO_PUBLIC_BACKEND_URL
      : typeof extra.backendUrl === "string" && extra.backendUrl.length > 0
        ? extra.backendUrl
        : "http://localhost:4000",
  cavosAppId:
    typeof process.env.EXPO_PUBLIC_CAVOS_APP_ID === "string" &&
    process.env.EXPO_PUBLIC_CAVOS_APP_ID.length > 0
      ? process.env.EXPO_PUBLIC_CAVOS_APP_ID
      : typeof extra.cavosAppId === "string" && extra.cavosAppId.length > 0
        ? extra.cavosAppId
        : "",
  cavosAppSalt:
    typeof extra.cavosAppSalt === "string"
      ? extra.cavosAppSalt
      : "geko-mobile",
  cctpUsdcIssuerTestnet:
    typeof process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_TESTNET === "string" &&
    process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_TESTNET.length > 0
      ? process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_TESTNET
      : typeof extra.cctpUsdcIssuerTestnet === "string" && extra.cctpUsdcIssuerTestnet.length > 0
        ? extra.cctpUsdcIssuerTestnet
        : DEFAULT_CCTP_USDC_ISSUER_TESTNET,
  cctpUsdcIssuerMainnet:
    typeof process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_MAINNET === "string" &&
    process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_MAINNET.length > 0
      ? process.env.EXPO_PUBLIC_CCTP_USDC_ISSUER_MAINNET
      : typeof extra.cctpUsdcIssuerMainnet === "string" && extra.cctpUsdcIssuerMainnet.length > 0
        ? extra.cctpUsdcIssuerMainnet
        : DEFAULT_CCTP_USDC_ISSUER_MAINNET,
  stellarTestnetRpcUrl:
    typeof process.env.EXPO_PUBLIC_STELLAR_TESTNET_RPC_URL === "string" &&
    process.env.EXPO_PUBLIC_STELLAR_TESTNET_RPC_URL.length > 0
      ? process.env.EXPO_PUBLIC_STELLAR_TESTNET_RPC_URL
      : typeof extra.stellarTestnetRpcUrl === "string" && extra.stellarTestnetRpcUrl.length > 0
        ? extra.stellarTestnetRpcUrl
        : DEFAULT_STELLAR_TESTNET_RPC_URL,
  stellarMainnetRpcUrl:
    typeof process.env.EXPO_PUBLIC_STELLAR_MAINNET_RPC_URL === "string" &&
    process.env.EXPO_PUBLIC_STELLAR_MAINNET_RPC_URL.length > 0
      ? process.env.EXPO_PUBLIC_STELLAR_MAINNET_RPC_URL
      : typeof extra.stellarMainnetRpcUrl === "string" && extra.stellarMainnetRpcUrl.length > 0
        ? extra.stellarMainnetRpcUrl
        : DEFAULT_STELLAR_MAINNET_RPC_URL,
  environment: toEnvironment(extra.environment),
  requestTimeoutMs:
    typeof extra.requestTimeoutMs === "number" ? extra.requestTimeoutMs : 15000,
  stellarNetwork: toStellarNetwork(
    typeof process.env.EXPO_PUBLIC_STELLAR_NETWORK === "string" &&
      process.env.EXPO_PUBLIC_STELLAR_NETWORK.length > 0
      ? process.env.EXPO_PUBLIC_STELLAR_NETWORK
      : extra.stellarNetwork
  ),
};
