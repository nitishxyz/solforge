import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'topup' | 'deduction'
    amountUsd: text("amount_usd").notNull(),
    txSignature: text("tx_signature"),
    provider: text("provider"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    balanceAfter: text("balance_after").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
