# Geko

Turborepo monorepo for the Geko product: the Expo mobile app and its supporting backend services.

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

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run build`     | Build shared packages and the server            |
| `npm run typecheck` | Typecheck every workspace                        |
| `npm run lint`      | Lint every workspace                             |
| `npm run test`      | Run each workspace's tests                       |
| `npm run dev`       | Run all `dev` scripts (persistent)              |

> `packages/defindex-vault` must be built before the mobile app bundles, since
> the app imports its compiled `dist/`. `turbo`'s `^build` dependency handles
> this ordering for `build`/`typecheck`/`test`; run `npm run build` after a fresh
> clone before `npm run dev`.

## EAS builds

Run from the mobile app directory; EAS auto-detects the workspace root:

```bash
cd apps/mobile
eas build --profile ios-simulator --platform ios
```
