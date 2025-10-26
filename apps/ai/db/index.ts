import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";
import { Resource } from "sst";

const pool = new Pool({
  connectionString: Resource.DatabaseUrl.value as unknown as string,
});
export const db = drizzle(pool, { schema });

// Export types
export * from "./types";
