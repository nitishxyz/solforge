import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { messageParts } from "./message-parts";

export const artifacts = pgTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    messagePartId: text("message_part_id")
      .notNull()
      .references(() => messageParts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    path: text("path"),
    mime: text("mime"),
    size: integer("size"),
    sha256: text("sha256"),
  },
  (table) => ({
    messagePartIdx: index("artifacts_message_part_idx").on(table.messagePartId),
  }),
);
