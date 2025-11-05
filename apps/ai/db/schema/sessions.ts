import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    walletAddress: text("wallet_address")
      .notNull()
      .references(() => users.walletAddress, { onDelete: "cascade" }),
    title: text("title"),
    agent: text("agent").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    projectPath: text("project_path").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp("last_active_at", {
      withTimezone: true,
    }),
    totalInputTokens: bigint("total_input_tokens", { mode: "number" }),
    totalOutputTokens: bigint("total_output_tokens", { mode: "number" }),
    totalCachedTokens: bigint("total_cached_tokens", { mode: "number" }),
    totalReasoningTokens: bigint("total_reasoning_tokens", { mode: "number" }),
    totalToolTimeMs: integer("total_tool_time_ms"),
    toolCountsJson: jsonb("tool_counts_json"),
  },
  (table) => ({
    walletIdx: index("sessions_wallet_idx").on(table.walletAddress),
    agentIdx: index("sessions_agent_idx").on(table.agent),
    lastActiveIdx: index("sessions_last_active_idx").on(table.lastActiveAt),
  }),
);
