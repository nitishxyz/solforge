import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const addressSignatures = sqliteTable(
  "address_signatures",
  {
    address: text("address").notNull(),
    signature: text("signature").notNull(),
    slot: integer("slot").notNull(),
    err: integer("err").notNull(), // 0 or 1
    blockTime: integer("block_time")
  },
  (t) => ({
    pk: primaryKey({ columns: [t.address, t.signature], name: "pk_address_signatures" }),
    addressSlotIdx: index("idx_address_signatures_addr_slot").on(t.address, t.slot)
  })
);

export type AddressSignatureRow = typeof addressSignatures.$inferSelect;
export type NewAddressSignatureRow = typeof addressSignatures.$inferInsert;

