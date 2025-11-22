import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions";

export const messages = sqliteTable("messages", {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
        .notNull()
        .references(() => sessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system'

    // Content stored as JSON string for flexibility with parts
    content: text("content", { mode: "json" }).notNull(),

    status: text("status").notNull(), // 'pending' | 'complete' | 'error'

    // Metadata
    agent: text("agent"),
    provider: text("provider"),
    model: text("model"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
});
