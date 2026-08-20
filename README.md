# Geko

Stellar wallet: an Expo mobile app and the NestJS API behind it, in one npm-workspaces
monorepo driven by Turborepo.

## Layout

```
apps/
  mobile/           # Expo / React Native app, expo-router (see apps/mobile/README.md)
  backend/          # NestJS API, Drizzle + Postgres (see apps/backend/README.md)
packages/
  defindex-vault/   # Shared TypeScript client for the DeFindex vault
```

## Prerequisites

- **Node.js 22.** CI runs on 22; newer versions work locally.
- **npm** for workspaces. The pinned version is in `packageManager` in the root
  `package.json`; run `corepack enable` to match it exactly.
- **Docker**, for the local Postgres the backend needs.
- To run the app on a device or simulator: Xcode (iOS) or Android Studio (Android). The
  Expo Go path needs neither, with the caveats in [apps/mobile/README.md](apps/mobile/README.md).

## Getting started

```bash
# 1. Install every workspace from the single hoisted lockfile
npm install

# 2. Build the shared packages the app and API import from dist/
npm run build
```

### Configure the environment

Both apps ship an `.env.example` listing every variable they read. Copy them and fill in
the values that have no default:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

The backend validates its environment at boot and refuses to start without `DATABASE_URL`,
both JWT secrets, `CAVOS_APP_ID`, `CAVOS_APP_SALT`, `CAVOS_NETWORK`, `MOBILE_APP_ORIGIN`
and a valid `WALLET_SECRETS_ENCRYPTION_KEY`. The example file carries usable local values
for all but the Cavos app id and the encryption key; generate the latter with:

```bash
openssl rand -base64 32
```

The mobile defaults point at `http://localhost:4000`, so a local backend needs no change
there.

### Start Postgres and apply migrations

```bash
docker compose -f apps/backend/docker-compose.yml up -d
```

```bash
cd apps/backend && npx drizzle-kit migrate --config=drizzle.config.ts
```

See [apps/backend/README.md](apps/backend/README.md) for generating new migrations. (#24
wraps these in `db:generate` / `db:migrate` scripts; update this section when it lands.)

### Run

```bash
npm run dev                     # every workspace's dev script at once
npm run dev -w geko-backend     # API only, on :4000
npm run dev -w geko-mobile      # Expo dev server only
```

## Tasks

All tasks run through Turborepo from the repo root:

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run build`     | Build shared packages and the backend |
| `npm run typecheck` | Typecheck every workspace             |
| `npm run lint`      | Lint every workspace                  |
| `npm run test`      | Run each workspace's tests            |
| `npm run dev`       | Run all `dev` scripts (persistent)    |

Run `turbo` through npm scripts or `npx turbo`, never a globally installed binary: a global
turbo cannot detect this repo's local install, silently falls back to whatever version it
happens to be, and prints a version warning as it goes.

> `packages/defindex-vault` must be built before the mobile app bundles, since the app
> imports its compiled `dist/`. Turborepo's `^build` dependency handles that ordering for
> `build`/`typecheck`/`test`; run `npm run build` after a fresh clone before `npm run dev`.

### Expo typed routes

`apps/mobile/.expo/types/router.d.ts` is generated and gitignored, so it is missing on a
fresh clone and goes stale whenever routes move. Missing types silently weaken `Href` to
`string`; stale types invent typecheck errors for routes that do exist.

`npm run typecheck` regenerates it automatically through `pretypecheck`. To refresh it on
its own, for instance when an editor is holding old types:

```bash
npm run types:routes -w geko-mobile
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and on
pushes to `main`:

| Job           | What it does                                                          |
| ------------- | --------------------------------------------------------------------- |
| `checks`      | `npm ci`, then typecheck, lint and test, with npm and `.turbo` caching |
| `expo-doctor` | `npx expo-doctor` for `apps/mobile` (not required for merge)           |
| `migrations`  | Applies `apps/backend` migrations to a fresh Postgres 16               |

`checks` regenerates the typed routes before typechecking, so a missing or stale
`router.d.ts` can neither fail the build nor hide a real route error. Lint fails on errors
only; the known warnings from generated Gluestack UI files are tolerated.

## EAS builds

Run from the mobile app directory; EAS auto-detects the workspace root:

```bash
cd apps/mobile
eas build --profile ios-simulator --platform ios
```
