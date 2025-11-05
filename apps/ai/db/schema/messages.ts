import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sessions } from "./sessions";

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull(),
    agent: text("agent").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
    latencyMs: integer("latency_ms"),
    promptTokens: bigint("prompt_tokens", { mode: "number" }),
    completionTokens: bigint("completion_tokens", { mode: "number" }),
    totalTokens: bigint("total_tokens", { mode: "number" }),
    cachedInputTokens: bigint("cached_input_tokens", { mode: "number" }),
    reasoningTokens: bigint("reasoning_tokens", { mode: "number" }),
    error: text("error"),
    errorType: text("error_type"),
    errorDetails: jsonb("error_details"),
    isAborted: boolean("is_aborted"),
  },
  (table) => ({
    sessionIdx: index("messages_session_idx").on(table.sessionId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
    roleIdx: index("messages_role_idx").on(table.role),
  }),
);
