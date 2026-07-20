import Constants from "expo-constants";

import type { StellarNetworkId } from "@/src/domain/wallet";

type AppEnvironment = "development" | "preview" | "production";

interface AppConfig {
  apiBaseUrl: string;
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
  environment: toEnvironment(extra.environment),
  requestTimeoutMs:
    typeof extra.requestTimeoutMs === "number" ? extra.requestTimeoutMs : 15000,
  stellarNetwork: toStellarNetwork(extra.stellarNetwork),
};
