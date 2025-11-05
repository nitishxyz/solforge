import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import {
  messageParts as messagePartsTable,
  messages as messagesTable,
  sessions as sessionsTable,
} from "../../../db/schema";
import type {
  Message,
  MessagePart,
  NewMessage,
  NewMessagePart,
  NewSession,
  Session,
} from "../../../db/types";
import type {
  ChatMessage,
  ChatMessagePart,
  ChatMessagePartContent,
  ChatSession,
} from "./types";

function mapSession(row: Session): ChatSession {
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    title: row.title,
    agent: row.agent,
    provider: row.provider,
    model: row.model,
    projectPath: row.projectPath,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
    totalInputTokens: row.totalInputTokens ?? null,
    totalOutputTokens: row.totalOutputTokens ?? null,
    totalCachedTokens: row.totalCachedTokens ?? null,
    totalReasoningTokens: row.totalReasoningTokens ?? null,
    totalToolTimeMs: row.totalToolTimeMs ?? null,
    toolCounts: (row.toolCountsJson as Record<string, number> | null) ?? null,
  };
}

function mapMessagePart(row: MessagePart): ChatMessagePart {
  const content =
    (row.content as ChatMessagePartContent | null) ??
    ({
      type: "text",
      text: "",
    } satisfies ChatMessagePartContent);

  return {
    id: row.id,
    messageId: row.messageId,
    index: row.index,
    stepIndex: row.stepIndex ?? null,
    type: content.type,
    content,
    agent: row.agent,
    provider: row.provider,
    model: row.model,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    toolName: row.toolName ?? null,
    toolCallId: row.toolCallId ?? null,
    toolDurationMs: row.toolDurationMs ?? null,
  };
}

function mapMessage(
  row: Message & { parts?: MessagePart[] },
): ChatMessage {
  const parts = row.parts?.map(mapMessagePart) ?? [];

  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as ChatMessage["role"],
    status: row.status as ChatMessage["status"],
    agent: row.agent,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    latencyMs: row.latencyMs ?? null,
    promptTokens: row.promptTokens ?? null,
    completionTokens: row.completionTokens ?? null,
    totalTokens: row.totalTokens ?? null,
    cachedInputTokens: row.cachedInputTokens ?? null,
    reasoningTokens: row.reasoningTokens ?? null,
    error: row.error ?? null,
    errorType: row.errorType ?? null,
    errorDetails: (row.errorDetails as Record<string, unknown> | null) ?? null,
    isAborted: row.isAborted ?? null,
    parts,
  };
}

export async function createSession(
  input: Omit<NewSession, "id" | "createdAt" | "lastActiveAt"> & {
    id?: string;
    createdAt?: Date;
  },
): Promise<ChatSession> {
  const id = input.id ?? randomUUID();
  const createdAt = input.createdAt ?? new Date();

  const [session] = await db
    .insert(sessionsTable)
    .values({
      ...input,
      id,
      createdAt,
      lastActiveAt: createdAt,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to create session");
  }

  return mapSession(session);
}

export async function findSessionById(
  walletAddress: string,
  sessionId: string,
): Promise<ChatSession | null> {
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessionsTable.id, sessionId),
      eq(sessionsTable.walletAddress, walletAddress),
    ),
  });

  return session ? mapSession(session) : null;
}

export async function listSessions(
  walletAddress: string,
  limit: number,
  offset: number,
): Promise<{ rows: ChatSession[]; total: number }> {
  const rows = await db.query.sessions.findMany({
    where: eq(sessionsTable.walletAddress, walletAddress),
    orderBy: [desc(sessionsTable.lastActiveAt), desc(sessionsTable.createdAt)],
    limit,
    offset,
  });

  const totalResult = await db
    .select({ count: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.walletAddress, walletAddress));

  const total = Number(totalResult.at(0)?.count ?? 0);

  return {
    rows: rows.map(mapSession),
    total,
  };
}

export async function getSessionMessages(
  sessionId: string,
  limit?: number,
  offset?: number,
): Promise<ChatMessage[]> {
  const messages = await db.query.messages.findMany({
    where: eq(messagesTable.sessionId, sessionId),
    with: {
      parts: {
        orderBy: (parts, { asc }) => [asc(parts.index)],
      },
    },
    orderBy: (message, { asc }) => [asc(message.createdAt)],
    limit,
    offset,
  });

  return messages.map(mapMessage);
}

export async function loadLatestMessagePreview(
  sessionId: string,
): Promise<
  | (Pick<ChatMessage, "id" | "role" | "status" | "createdAt"> & {
      preview: string | null;
    })
  | undefined
> {
  const message = await db.query.messages.findFirst({
    where: eq(messagesTable.sessionId, sessionId),
    with: {
      parts: {
        orderBy: (parts, { asc }) => [asc(parts.index)],
      },
    },
    orderBy: (message, { desc }) => [desc(message.createdAt)],
  });

  if (!message) {
    return undefined;
  }

  const mapped = mapMessage(message);
  const preview =
    mapped.parts.find((part) => part.type === "text")?.content.text ?? null;

  return {
    id: mapped.id,
    role: mapped.role,
    status: mapped.status,
    createdAt: mapped.createdAt,
    preview,
  };
}

interface InsertMessageInput
  extends Omit<NewMessage, "id" | "createdAt" | "completedAt"> {
  id?: string;
  createdAt?: Date;
  completedAt?: Date | null;
}

export async function insertMessage(
  input: InsertMessageInput,
  parts: Array<Omit<NewMessagePart, "id" | "messageId"> & { id?: string }>,
): Promise<ChatMessage> {
  const createdAt = input.createdAt ?? new Date();

  const [message] = await db
    .insert(messagesTable)
    .values({
      ...input,
      id: input.id ?? randomUUID(),
      createdAt,
      completedAt: input.completedAt ?? createdAt,
    })
    .returning();

  if (!message) {
    throw new Error("Failed to insert message");
  }

  const messageParts = await Promise.all(
    parts.map((part, index) =>
      db
        .insert(messagePartsTable)
        .values({
          ...part,
          id: part.id ?? randomUUID(),
          messageId: message.id,
          index: part.index ?? index,
          startedAt: part.startedAt ?? createdAt,
          completedAt: part.completedAt ?? createdAt,
        })
        .returning()
        .then((rows) => rows[0]),
    ),
  );

  const joined: Message & { parts: MessagePart[] } = {
    ...message,
    parts: messageParts.filter(Boolean) as MessagePart[],
  };

  return mapMessage(joined);
}

export async function updateSessionActivity(
  sessionId: string,
  lastActiveAt: Date,
  totals?: {
    totalInputTokens?: number | null;
    totalOutputTokens?: number | null;
    totalCachedTokens?: number | null;
    totalReasoningTokens?: number | null;
    totalToolTimeMs?: number | null;
    toolCounts?: Record<string, number> | null;
  },
): Promise<void> {
  const update: Partial<Session> = {
    lastActiveAt,
  };

  if (totals) {
    if (totals.totalInputTokens !== undefined) {
      update.totalInputTokens = totals.totalInputTokens;
    }
    if (totals.totalOutputTokens !== undefined) {
      update.totalOutputTokens = totals.totalOutputTokens;
    }
    if (totals.totalCachedTokens !== undefined) {
      update.totalCachedTokens = totals.totalCachedTokens;
    }
    if (totals.totalReasoningTokens !== undefined) {
      update.totalReasoningTokens = totals.totalReasoningTokens;
    }
    if (totals.totalToolTimeMs !== undefined) {
      update.totalToolTimeMs = totals.totalToolTimeMs;
    }
    if (totals.toolCounts !== undefined) {
      update.toolCountsJson = totals.toolCounts;
    }
  }

  await db
    .update(sessionsTable)
    .set(update)
    .where(eq(sessionsTable.id, sessionId));
}
