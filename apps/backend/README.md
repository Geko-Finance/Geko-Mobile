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
