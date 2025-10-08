import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const txAccounts = sqliteTable(
	"tx_accounts",
	{
		signature: text("signature").notNull(),
		accountIndex: integer("account_index").notNull(),
		address: text("address").notNull(),
		signer: integer("signer").notNull(), // 0 or 1
		writable: integer("writable").notNull(), // 0 or 1
		programIdIndex: integer("program_id_index"),
	},
	(t) => ({
		pk: primaryKey({
			columns: [t.signature, t.accountIndex],
			name: "pk_tx_accounts",
		}),
		addressIdx: index("idx_tx_accounts_address").on(t.address),
		addressSigIdx: index("idx_tx_accounts_address_signature").on(
			t.address,
			t.signature,
		),
	}),
);

export type TxAccountRow = typeof txAccounts.$inferSelect;
export type NewTxAccountRow = typeof txAccounts.$inferInsert;
