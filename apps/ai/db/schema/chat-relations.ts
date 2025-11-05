import { relations } from "drizzle-orm";
import { artifacts } from "./artifacts";
import { messageParts } from "./message-parts";
import { messages } from "./messages";
import { sessions } from "./sessions";

export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
  parts: many(messageParts),
}));

export const messagePartsRelations = relations(messageParts, ({ one }) => ({
  message: one(messages, {
    fields: [messageParts.messageId],
    references: [messages.id],
  }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  part: one(messageParts, {
    fields: [artifacts.messagePartId],
    references: [messageParts.id],
  }),
}));
