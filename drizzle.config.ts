import { defineConfig } from "drizzle-kit";
const dbPath = process.env.SOLFORGE_DB_PATH || ".solforge/db.db";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema"],
  out: "./drizzle",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
