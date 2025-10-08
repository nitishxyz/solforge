import Database from "bun:sqlite";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { bundledMigrations } from "../migrations-bundled";
import * as schema from "./schema";

// DB path is configurable; default to project-local hidden folder
const DB_PATH = process.env.SOLFORGE_DB_PATH || ".solforge/db.db";

// Ensure directory exists
try {
	mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {}

// Ephemeral by default (on-disk SQLite, cleared on each start).
// Set SOLFORGE_DB_MODE=persistent or SOLFORGE_DB_PERSIST=1 for persistent DB.
const PERSIST =
	process.env.SOLFORGE_DB_MODE === "persistent" ||
	process.env.SOLFORGE_DB_PERSIST === "1";
try {
	mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {}
if (!PERSIST && DB_PATH !== ":memory:") {
	try {
		if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
	} catch {}
	try {
		if (existsSync(`${DB_PATH}-wal`)) unlinkSync(`${DB_PATH}-wal`);
	} catch {}
	try {
		if (existsSync(`${DB_PATH}-shm`)) unlinkSync(`${DB_PATH}-shm`);
	} catch {}
}

// Create SQLite connection and apply performance PRAGMAs
export const sqlite = new Database(DB_PATH);
try {
	// Use DELETE journal to avoid VNODE/WAL issues across environments
	sqlite.exec("PRAGMA journal_mode=DELETE;");
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
	// Prefer folder-based migrations when available (dev/uncompiled)
	if (existsSync(migrationsFolder)) {
		await migrate(db, { migrationsFolder });
		console.log("✅ Database migrations completed (folder)");
	} else {
		// Bundled mode: apply embedded SQL files if schema isn't present
		const haveTx = sqlite
			.query(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
			)
			.get() as { name?: string } | undefined;
		if (!haveTx?.name) {
			for (const m of bundledMigrations) {
				try {
					const sql = await Bun.file(m.path).text();
					sqlite.exec(sql);
					// console.log(`✅ Applied bundled migration: ${m.name}`);
				} catch (e) {
					console.error(`❌ Failed bundled migration: ${m.name}`, e);
					throw e;
				}
			}
		}
		console.log("✅ Database migrations completed (bundled)");
	}
} catch (error) {
	console.error("❌ Database migration failed:", error);
}
