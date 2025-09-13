import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";
import { mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// DB path is configurable; default to project-local hidden folder
const DB_PATH = process.env.SOLFORGE_DB_PATH || ".solforge/db.db";

// Ensure directory exists
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

// Ephemeral by default: reset DB file on each start unless explicitly persistent
const PERSIST = process.env.SOLFORGE_DB_MODE === "persistent" || process.env.SOLFORGE_DB_PERSIST === "1";
if (!PERSIST && DB_PATH !== ":memory:") {
  try {
    if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
  } catch {}
  try {
    if (existsSync(DB_PATH + "-wal")) unlinkSync(DB_PATH + "-wal");
  } catch {}
  try {
    if (existsSync(DB_PATH + "-shm")) unlinkSync(DB_PATH + "-shm");
  } catch {}
}

// Create SQLite connection and apply performance PRAGMAs
export const sqlite = new Database(DB_PATH);
try {
  sqlite.exec("PRAGMA journal_mode=WAL;");
  sqlite.exec("PRAGMA synchronous=NORMAL;");
  sqlite.exec("PRAGMA temp_store=MEMORY;");
  sqlite.exec("PRAGMA busy_timeout=1000;");
} catch {}

// Drizzle database instance with typed schema
export const db = drizzle(sqlite, { schema });

export type { SQLiteDatabase } from "drizzle-orm/sqlite-core";
export * as dbSchema from "./schema";

// Run Drizzle migrations on app start (Bun + SQLite)
const migrationsFolder = process.env.DRIZZLE_MIGRATIONS || "drizzle";
try {
  // Top-level await is supported in Bun
  await migrate(db, { migrationsFolder });
  console.log("✅ Local database migrations completed");
} catch (error) {
  console.error("❌ Local database migration failed:", error);
}
