import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "./schema";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
import { users, transactions, paymentLogs } from "./schema";

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export type PaymentLog = InferSelectModel<typeof paymentLogs>;
export type NewPaymentLog = InferInsertModel<typeof paymentLogs>;
