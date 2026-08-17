# Geko

## Layout

```
apps/
  mobile/   # Expo / React Native app (see apps/mobile/README.md)
  server/   # geko-cavos-server — HTTP wrapper for @cavos/kit Stellar support
packages/
  defindex-vault/   # Shared TypeScript client for the DeFindex vault
```

## Prerequisites

- Node.js (see `packageManager` in the root `package.json` for the pinned npm version)
- Package manager: **npm** (workspaces)

## Getting started

```bash
# Install all workspaces (single hoisted lockfile)
npm install

# Build shared packages (required before the app can resolve them)
npm run build

# Start everything in dev (Turborepo runs each workspace's `dev` script)
npm run dev
```

Run a single app instead:

```bash
npm run dev -w geko-mobile        # Expo app
npm run dev -w geko-cavos-server  # backend
```

## Tasks

All tasks run through Turborepo from the repo root:

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run build`     | Build shared packages and the server |
| `npm run typecheck` | Typecheck every workspace            |
| `npm run lint`      | Lint every workspace                 |
| `npm run test`      | Run each workspace's tests           |
| `npm run dev`       | Run all `dev` scripts (persistent)   |

> `packages/defindex-vault` must be built before the mobile app bundles, since
> the app imports its compiled `dist/`. `turbo`'s `^build` dependency handles
> this ordering for `build`/`typecheck`/`test`; run `npm run build` after a fresh
> clone before `npm run dev`.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and
on pushes to `main`:

| Job                    | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `checks`               | `npm ci` → typecheck → lint → test, with npm and `.turbo` caching |
| `expo-doctor`          | `npx expo-doctor` for `apps/mobile` (not required for merge)      |
| `migrations`           | Applies `apps/backend` migrations to a fresh Postgres 16          |

`checks` regenerates the Expo typed routes (`npm run types:routes -w geko-mobile`)
before typechecking, so a missing or stale `.expo/types/router.d.ts` can neither fail
the build nor hide a real route error. Lint fails on errors only; the known warnings
from generated Gluestack UI files are tolerated.

## EAS builds

Run from the mobile app directory; EAS auto-detects the workspace root:

```bash
cd apps/mobile
eas build --profile ios-simulator --platform ios
```
