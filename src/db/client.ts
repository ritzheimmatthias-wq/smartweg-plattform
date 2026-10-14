import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrationSql } from "./migration";
import * as schema from "./schema";
import { seedDemo } from "./seed";

export type Db = PgliteDatabase<typeof schema>;

/**
 * Entwicklung und Tests laufen auf PGlite, einem eingebetteten Postgres. Der
 * Speicherort kommt aus SMARTWEG_DATA_DIR (Standard: ./.data/pglite);
 * "memory://" hält alles im Arbeitsspeicher. Für den Betrieb wird später auf
 * einen Postgres-Server in Deutschland umgestellt; das Schema bleibt gleich.
 */
export async function openDb(dataDir = process.env.SMARTWEG_DATA_DIR ?? "./.data/pglite"): Promise<Db> {
  if (!dataDir.includes("://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.exec(migrationSql);
  const db = drizzle(client, { schema });
  await seedDemo(db);
  return db;
}

const g = globalThis as unknown as { smartwegDb?: Promise<Db> };

/** Eine Verbindung pro Serverprozess, auch über Hot Reload hinweg. */
export function getDb(): Promise<Db> {
  g.smartwegDb ??= openDb();
  return g.smartwegDb;
}
