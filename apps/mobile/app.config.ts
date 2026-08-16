import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "geko-mobile",
  slug: "geko-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/icons/iconAppSquare.png",
  scheme: ["gekomobile", "web+stellar"],
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gekomobile.gekomobile",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSFaceIDUsageDescription: "Use Face ID to protect wallet signing and recovery details.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./src/assets/icons/iconAppSquare.png",
      backgroundImage: "./src/assets/icons/iconAppSquare.png",
      monochromeImage: "./src/assets/icons/iconAppSquare.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.gekomobile.gekomobile",
  },
  web: {
    output: "static",
    favicon: "./src/assets/icons/iconAppSquare.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./src/assets/images/splash/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-font",
    "expo-localization",
    "expo-secure-store",
    "expo-local-authentication",
    "expo-web-browser",
    [
      "expo-camera",
      {
        cameraPermission: "Geko needs camera access to scan wallet addresses.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // EXPO_PUBLIC_* vars are inlined at build time by Expo/Metro; non-prefixed vars
    // (APP_ENVIRONMENT) are only visible here, at config-eval time, and baked into
    // this computed `extra` block instead. See apps/mobile/src/config/env.ts for the
    // read-precedence (env var -> extra -> hardcoded default) that consumes this.
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:4000",
    environment: process.env.APP_ENVIRONMENT ?? "development",
    requestTimeoutMs: 15000,
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK ?? "testnet",
    cavosAppId: process.env.EXPO_PUBLIC_CAVOS_APP_ID ?? "",
    cavosAppSalt: "geko-mobile",
    router: {},
    eas: {
      projectId: "ce6acf82-0902-40c8-b1ef-542195c6d92e",
    },
  },
  owner: "geko-mobile",
});
