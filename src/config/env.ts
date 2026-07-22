import Constants from "expo-constants";

import type { StellarNetworkId } from "@/src/domain/wallet";

type AppEnvironment = "development" | "preview" | "production";

interface AppConfig {
  apiBaseUrl: string;
  cavosAppId: string;
  cavosBackendUrl: string;
  cavosAppSalt: string;
  environment: AppEnvironment;
  requestTimeoutMs: number;
  stellarNetwork: StellarNetworkId;
}

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
  apiBaseUrl:
    typeof extra.apiBaseUrl === "string"
      ? extra.apiBaseUrl
      : "https://api.example.com",
  cavosAppId:
    typeof process.env.EXPO_PUBLIC_CAVOS_APP_ID === "string" &&
    process.env.EXPO_PUBLIC_CAVOS_APP_ID.length > 0
      ? process.env.EXPO_PUBLIC_CAVOS_APP_ID
      : typeof extra.cavosAppId === "string" && extra.cavosAppId.length > 0
        ? extra.cavosAppId
        : "",
  cavosBackendUrl:
    typeof process.env.EXPO_PUBLIC_CAVOS_BACKEND_URL === "string" &&
    process.env.EXPO_PUBLIC_CAVOS_BACKEND_URL.length > 0
      ? process.env.EXPO_PUBLIC_CAVOS_BACKEND_URL
      : typeof extra.cavosBackendUrl === "string" &&
          extra.cavosBackendUrl.length > 0
        ? extra.cavosBackendUrl
        : "http://localhost:4000",
  cavosAppSalt:
    typeof extra.cavosAppSalt === "string"
      ? extra.cavosAppSalt
      : "geko-mobile",
  environment: toEnvironment(extra.environment),
  requestTimeoutMs:
    typeof extra.requestTimeoutMs === "number" ? extra.requestTimeoutMs : 15000,
  stellarNetwork: toStellarNetwork(extra.stellarNetwork),
};
