import { pgTable, timestamp, text, numeric, uuid, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const paymentLogs = pgTable("payment_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").notNull().references(() => users.walletAddress),
  txSignature: text("tx_signature").notNull().unique(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "confirmed", "failed"] }).notNull().default("pending"),
  verified: boolean("verified").notNull().default(false),
  facilitatorUrl: text("facilitator_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});
