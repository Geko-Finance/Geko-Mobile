# Geko Mobile

The Expo app: a Stellar wallet with custodial (Cavos) and non-custodial accounts, multisig
proposals, SEP-7 links and CCTP USDC transfers.

Everything installs from the repo root, not from here. Start with the
[root README](../../README.md) if this is your first run.

## Prerequisites

- The root setup done once: `npm install` and `npm run build` at the repo root.
- `apps/mobile/.env` copied from `.env.example`. Every value has a working default for
  local development except the Cavos app id.
- The backend running on `:4000`, unless you point `EXPO_PUBLIC_BACKEND_URL` elsewhere.
- Xcode or Android Studio for a simulator, or the Expo Go app on a physical device.

## Running

From the repo root:

```bash
npm run dev -w geko-mobile
```

Or from this directory:

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Expo dev server for a development build                       |
| `npm run ios`       | Build and run on the iOS simulator (needs Xcode)              |
| `npm run android`   | Build and run on an Android emulator (needs Android Studio)   |
| `npm run expo-go`   | Dev server over LAN for Expo Go, cache cleared                |
| `npm run test`      | Jest, offline and fully mocked                                |
| `npm run typecheck` | `tsc --noEmit`, regenerating typed routes first               |
| `npm run lint`      | ESLint via `expo lint`                                        |
| `npm run doctor`    | `expo-doctor` dependency and config checks                    |

**Expo Go is not the full app.** Native modules such as `expo-local-authentication` and
`expo-secure-store` behave differently or not at all there, and both sit on the signing
path. Use a development build for anything touching wallets, and never fund a wallet
created in a debugged dev build: `expo-crypto` falls back to `Math.random()` when remote
JS debugging is attached.

## Layout

```
app/                 # expo-router routes only: layouts and re-exports, no business logic
src/
  features/*         # product domains and their screens
  domain/*           # business types shared across features
  services/*         # API clients, storage, wallet, SEP-7, crypto
  providers/*        # app-wide providers
```

Zustand owns local client state, TanStack Query owns server state, and `SecureStore` holds
secrets and session tokens. `AsyncStorage` is for non-secret metadata only. The full
conventions are in [CLAUDE.md](CLAUDE.md); deeper notes are in [docs/](docs).

## Typed routes

`.expo/types/router.d.ts` is generated and gitignored. It is missing on a fresh clone and
goes stale when routes move: missing types weaken `Href` to `string` and hide real
mistakes, stale types invent errors for routes that do exist.

`npm run typecheck` regenerates it first, through `pretypecheck`. To refresh it alone:

```bash
npm run types:routes
```

## Builds

```bash
npm run dev-ios-simulator-build      # EAS build for the iOS simulator
npm run dev-android-simulator-build  # EAS development build for Android
```

EAS auto-detects the workspace root, so these run from this directory. Profiles live in
[eas.json](eas.json).
