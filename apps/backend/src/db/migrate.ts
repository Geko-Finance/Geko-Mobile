import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Applies pending migrations from src/db/migrations, the same folder drizzle-kit generates
// into. Runs from the compiled build (dist/db/migrate.js), so production images need only
// drizzle-orm, not drizzle-kit. Each run is idempotent: applied migrations are tracked in
// drizzle.__drizzle_migrations and skipped.
async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  // A single connection: migrations run sequentially, and a pool would only hold idle
  // connections open against the database's connection limit.
  const client = postgres(databaseUrl, { max: 1 });

  try {
    await migrate(drizzle(client), {
      migrationsFolder: join(__dirname, 'migrations'),
    });
    console.log('Migrations applied');
  } finally {
    await client.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
