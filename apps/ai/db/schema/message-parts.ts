import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { messages } from "./messages";

export const messageParts = pgTable(
  "message_parts",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    stepIndex: integer("step_index"),
    type: text("type").notNull(),
    content: jsonb("content").notNull(),
    agent: text("agent").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    toolName: text("tool_name"),
    toolCallId: text("tool_call_id"),
    toolDurationMs: integer("tool_duration_ms"),
  },
  (table) => ({
    messageIdx: index("message_parts_message_idx").on(table.messageId),
    orderIdx: index("message_parts_order_idx").on(table.messageId, table.index),
  }),
);
