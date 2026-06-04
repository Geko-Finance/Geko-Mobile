import Constants from "expo-constants";

type AppEnvironment = "development" | "preview" | "production";

interface AppConfig {
  apiBaseUrl: string;
  environment: AppEnvironment;
  requestTimeoutMs: number;
}

const extra = Constants.expoConfig?.extra ?? {};

const toEnvironment = (value: unknown): AppEnvironment => {
  if (value === "preview" || value === "production") {
    return value;
  }

  return "development";
};

export const appConfig: AppConfig = {
  apiBaseUrl:
    typeof extra.apiBaseUrl === "string"
      ? extra.apiBaseUrl
      : "https://api.example.com",
  environment: toEnvironment(extra.environment),
  requestTimeoutMs:
    typeof extra.requestTimeoutMs === "number" ? extra.requestTimeoutMs : 15000,
};
