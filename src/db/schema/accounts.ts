import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
	"accounts",
	{
		address: text("address").primaryKey(),
		lamports: integer("lamports").notNull(),
		ownerProgram: text("owner_program").notNull(),
		executable: integer("executable").notNull(), // 0 or 1
		rentEpoch: integer("rent_epoch").notNull(),
		dataLen: integer("data_len").notNull(),
		// Optional raw bytes; disabled by default in runtime
		dataBase64: text("data_base64"),
		lastSlot: integer("last_slot").notNull(),
	},
	(t) => ({
		ownerIdx: index("idx_accounts_owner").on(t.ownerProgram),
		lastSlotIdx: index("idx_accounts_last_slot").on(t.lastSlot),
	}),
);

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
