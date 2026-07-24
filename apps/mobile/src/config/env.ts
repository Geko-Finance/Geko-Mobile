import Constants from "expo-constants";

import type { StellarNetworkId } from "@/src/domain/wallet";

type AppEnvironment = "development" | "preview" | "production";

interface AppConfig {
  backendUrl: string;
  cavosAppId: string;
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
  environment: toEnvironment(extra.environment),
  requestTimeoutMs:
    typeof extra.requestTimeoutMs === "number" ? extra.requestTimeoutMs : 15000,
  stellarNetwork: toStellarNetwork(extra.stellarNetwork),
};
