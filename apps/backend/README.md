# Geko Backend

NestJS API for the Geko wallet. This workspace is scaffold-only; auth, wallets, and database schema modules are added in later phases.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Start local Postgres:

   ```bash
   docker compose up -d
   ```

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
