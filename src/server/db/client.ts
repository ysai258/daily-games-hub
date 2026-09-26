import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle');

/**
 * With DATABASE_URL set (production, or a local Postgres) the app talks to real
 * Postgres. Without it, local dev runs an embedded Postgres (PGlite) in .data/ and
 * migrates it on start, so `npm run dev` needs no setup.
 *
 * The instance lives on globalThis because Next's dev server re-evaluates modules on
 * every edit, and two PGlite instances on one directory corrupt it.
 */
const globalForDb = globalThis as unknown as { __hubDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__hubDb ??= createDb().catch((error: unknown) => {
    globalForDb.__hubDb = undefined;
    throw error;
  });
  return globalForDb.__hubDb;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    // prepare:false keeps it compatible with pooled (PgBouncer) connection strings.
    return drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL must be set in production.');
  return createPgliteDb(process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite'));
}

/** Embedded Postgres, migrated. Pass no directory for a throwaway in-memory database. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  // PGlite creates its own directory but not the parents above it.
  if (dataDir) await mkdir(path.dirname(dataDir), { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
