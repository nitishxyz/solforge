import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  artifacts,
  messageParts,
  messages,
  paymentLogs,
  sessions,
  transactions,
  users,
} from "./schema";

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export type PaymentLog = InferSelectModel<typeof paymentLogs>;
export type NewPaymentLog = InferInsertModel<typeof paymentLogs>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type MessagePart = InferSelectModel<typeof messageParts>;
export type NewMessagePart = InferInsertModel<typeof messageParts>;

export type Artifact = InferSelectModel<typeof artifacts>;
export type NewArtifact = InferInsertModel<typeof artifacts>;
