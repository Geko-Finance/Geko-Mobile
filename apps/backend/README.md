# Geko Backend

NestJS API for the Geko wallet. This workspace is scaffold-only; auth, wallets, and database schema modules are added in later phases.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres via the Supabase CLI)
- Supabase CLI (`brew install supabase/tap/supabase` or see https://supabase.com/docs/guides/cli/getting-started)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Start the local Supabase Postgres stack (only the `db` container; auth, storage, studio, and other services are excluded):

   From the repo root (also runs automatically as part of `npm run dev`):

   ```bash
   npm run supabase:start
   ```

   Or from this directory:

   ```bash
   supabase start --exclude edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector --yes
   ```

   To tear the stack down: `supabase stop` (or `npm run supabase:stop` from the repo root).

3. Install dependencies from the monorepo root (if you have not already):

   ```bash
   npm install
   ```

4. Run the API in watch mode:

   ```bash
   npm run dev --workspace=geko-backend
   ```

   Or from this directory:

   ```bash
   npm run dev
   ```

The server listens on `PORT` (default `4000`).

## Production configuration

The API validates security-critical configuration before NestJS starts. Production boot
fails when database or mobile-origin configuration is missing, when JWT secrets are
placeholders or shorter than 32 characters, or when the wallet encryption key is not a
base64-encoded 32-byte value. Validation errors name the affected variable but never
include its value.

Generate independent secrets for each deployment instead of copying the development
placeholders from `.env.example`:

```bash
# JWT access secret
openssl rand -base64 48

# JWT refresh secret (generate separately)
openssl rand -base64 48

# AES-256-GCM wallet-secrets key (exactly 32 bytes)
openssl rand -base64 32
```

Store these values in the deployment platform's secret manager. Do not commit them to
the repository or reuse them across environments. When `CAVOS_NETWORK=mainnet`, URL,
origin, endpoint, host, and network settings must not point to testnet.

The Abroad Finance integration is optional. It is enabled only when `ABROAD_API_KEY`,
`ABROAD_WEBHOOK_SECRET`, and `ABROAD_STELLAR_DEPOSIT_ADDRESS` are all non-empty; a
partial group is cleared during validation so cross-border endpoints remain safely
disabled and the webhook continues to fail closed.

## Swap aggregator

Set `SOROSWAP_API_KEY` to enable Soroswap quotes. The credential is used only by the
authenticated backend proxy and must never be placed in an `EXPO_PUBLIC_*` variable.
When it is absent, the mobile app continues to quote Stellar's native strict-send path
payments. `SOROSWAP_API_URL` defaults to `https://api.soroswap.finance` and normally
should not be changed.

The mobile app sends the active Stellar network (`testnet` or `mainnet`) with every
aggregator request. The backend forwards that network explicitly, so testnet quotes
cannot silently produce mainnet transactions.

## Database (Drizzle)

Schema files live under `src/db/schema` (added in the next phase). Migrations are written to `src/db/migrations`.

Push schema changes directly to the database during early development:

```bash
npx drizzle-kit push --config=drizzle.config.ts
```

Generate and apply migrations:

```bash
npx drizzle-kit generate --config=drizzle.config.ts
npx drizzle-kit migrate --config=drizzle.config.ts
```

Ensure `DATABASE_URL` is set (see `.env.example`).

## Scripts

| Script       | Description                          |
| ------------ | ------------------------------------ |
| `dev`        | Start NestJS with file watch         |
| `build`      | Compile to `dist/`                   |
| `typecheck`  | TypeScript check without emit        |
| `lint`       | Run ESLint                           |
| `test`       | Run Jest                             |
