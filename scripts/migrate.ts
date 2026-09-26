/**
 * Applies drizzle/ migrations to DATABASE_URL. Runs automatically before `next build`
 * on Vercel (`vercel-build`). Local dev without DATABASE_URL doesn't need it: the
 * embedded database migrates itself on start.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;

if (!url) {
  if (process.env.VERCEL) {
    console.error('DATABASE_URL is not set. Add a Postgres database to the Vercel project first.');
    process.exit(1);
  }
  console.log('DATABASE_URL not set — nothing to migrate (local dev uses the embedded database).');
  process.exit(0);
}

const client = postgres(url, { prepare: false, max: 1 });
await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
await client.end();
console.log('Migrations applied.');
