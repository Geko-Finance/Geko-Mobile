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
