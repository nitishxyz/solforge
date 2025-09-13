import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const metaKv = sqliteTable("meta_kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});

export type MetaKvRow = typeof metaKv.$inferSelect;
export type NewMetaKvRow = typeof metaKv.$inferInsert;

