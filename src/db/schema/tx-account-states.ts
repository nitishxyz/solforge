import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const txAccountStates = sqliteTable(
  "tx_account_states",
  {
    signature: text("signature").notNull(),
    address: text("address").notNull(),
    // JSON blobs capturing minimal account snapshot
    // { lamports, ownerProgram, executable, rentEpoch, dataLen, dataBase64? }
    preJson: text("pre_json"),
    postJson: text("post_json"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.signature, t.address], name: "pk_tx_account_states" }),
    addrIdx: index("idx_tx_account_states_address").on(t.address),
  }),
);

export type TxAccountStateRow = typeof txAccountStates.$inferSelect;
export type NewTxAccountStateRow = typeof txAccountStates.$inferInsert;

