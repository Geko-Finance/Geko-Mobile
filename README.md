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
- **Docker** — Docker Desktop must be running (used by the local Supabase Postgres stack)
- **Supabase CLI** — manages the local Postgres stack (`brew install supabase/tap/supabase` or see [Supabase CLI getting started](https://supabase.com/docs/guides/cli/getting-started))

## Getting started

```bash
# Install all workspaces (single hoisted lockfile)
npm install

# Build shared packages (required before the app can resolve them)
npm run build

# Start everything in dev — also brings up local Supabase Postgres (port 54432)
# before Turborepo runs each workspace's `dev` script; no separate step needed
npm run dev
```

When you're done, `npm run supabase:stop` tears down the local Supabase containers.

Run a single app instead:

```bash
npm run dev -w geko-mobile        # Expo app
npm run dev -w geko-cavos-server  # backend
```

## Tasks

All tasks run through Turborepo from the repo root:

| Command                 | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run build`         | Build shared packages and the server                                   |
| `npm run typecheck`     | Typecheck every workspace                                              |
| `npm run lint`          | Lint every workspace                                                   |
| `npm run test`          | Run each workspace's tests                                             |
| `npm run dev`           | Start local Supabase Postgres, then run all `dev` scripts (persistent) |
| `npm run supabase:stop` | Stop the local Supabase Postgres stack                                 |

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
