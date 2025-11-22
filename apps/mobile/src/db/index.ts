import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

const sqliteDb = openDatabaseSync("db.db");
const db = drizzle(sqliteDb);

// Run migrations on app start
try {
  migrate(db, migrations);
  console.log("✅ Local database migrations completed");
} catch (error) {
  console.error("❌ Local database migration failed:", error);
}

// Export the single instance
export default db;

// Export types
export * from "./types";
