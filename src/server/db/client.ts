import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> & { $client: Pool };
/** A database handle or an open transaction; repositories accept either. */
export type Executor =
  Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Database };

export function db(): Database {
  if (!globalForDb.db) {
    const pool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
    globalForDb.db = drizzle({ client: pool, schema, casing: "snake_case" });
  }
  return globalForDb.db;
}
