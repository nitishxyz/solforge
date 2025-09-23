import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable(
	"transactions",
	{
		signature: text("signature").primaryKey(),
		slot: integer("slot").notNull(),
		blockTime: integer("block_time"),
		version: text("version").notNull(), // 0 | "legacy"
		errJson: text("err_json"),
		fee: integer("fee").notNull(),
		rawBase64: text("raw_base64").notNull(),
		preBalancesJson: text("pre_balances_json").notNull(),
		postBalancesJson: text("post_balances_json").notNull(),
		logsJson: text("logs_json").notNull(),
		preTokenBalancesJson: text("pre_token_balances_json")
			.default("[]")
			.notNull(),
		postTokenBalancesJson: text("post_token_balances_json")
			.default("[]")
			.notNull(),
		// Additional rich metadata captured after execution
		innerInstructionsJson: text("inner_instructions_json")
			.default("[]")
			.notNull(),
		computeUnits: integer("compute_units"),
		returnDataProgramId: text("return_data_program_id"),
		returnDataBase64: text("return_data_base64"),
	},
	(t) => ({
		slotIdx: index("idx_transactions_slot").on(t.slot),
	}),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
