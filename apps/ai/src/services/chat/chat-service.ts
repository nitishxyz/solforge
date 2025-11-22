import { randomUUID } from "crypto";
import {
  createSession,
  findSessionById,
  getSessionMessages,
  insertMessage,
  listSessions,
  loadLatestMessagePreview,
  updateSessionActivity,
  updateSessionTitle,
} from "./repository";
import type {
  ChatMessage,
  ChatSession,
  ListSessionsResponse,
  SendMessageResult,
  SessionDetailResponse,
} from "./types";
import { handleOpenAI } from "../../providers/openai";
import { handleAnthropic } from "../../providers/anthropic";

interface CreateSessionInput {
  title?: string | null;
  agent: string;
  provider: string;
  model: string;
  projectPath: string;
}

interface SendMessageInput {
  content: string;
  attachments?: Array<{ kind: string; path?: string }>;
}

function ensureSessionOwnership(
  session: ChatSession | null,
): asserts session is ChatSession {
  if (!session) {
    const error = new Error("Session not found");
    (error as any).status = 404;
    throw error;
  }
}

function serializeMessagesForProvider(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const textPart = message.parts.find(
        (part) => part.type === "text" && part.content?.text,
      );
      if (!textPart) {
        return null;
      }

      return {
        role: message.role,
        content: textPart.content.text,
      };
    })
    .filter(
      (entry): entry is { role: "system" | "user" | "assistant"; content: string } =>
        Boolean(entry && entry.content),
    );
}

async function generateSessionTitle(
  walletAddress: string,
  session: ChatSession,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string | null> {
  try {
    const titleMessages = [
      ...messages,
      {
        role: "user" as const,
        content:
          "Generate a concise title (max 6 words) for this chat. Return only the title text.",
      },
    ];

    let result: any;
    const body = {
      model: session.model,
      messages: titleMessages,
      max_tokens: 50,
    };

    if (session.provider === "openai") {
      result = await handleOpenAI(walletAddress, body, {
        stream: false,
        responseFormat: "chat",
      });
    } else if (session.provider === "anthropic") {
      result = await handleAnthropic(walletAddress, body, { stream: false });
    } else {
      return null;
    }

    if (result.type === "complete") {
      const raw = result.response as any;
      const content = raw.choices?.[0]?.message?.content || "";
      const title = content.trim().replace(/^["']|["']$/g, "");
      return title.length > 0 && title.length < 100 ? title : null;
    }

    return null;
  } catch (error) {
    console.error("Failed to generate session title:", error);
    return null;
  }
}

export async function createSessionForWallet(
  walletAddress: string,
  input: CreateSessionInput,
): Promise<ChatSession> {
  const createdAt = new Date();

  return createSession({
    id: randomUUID(),
    walletAddress,
    title: input.title ?? null,
    agent: input.agent,
    provider: input.provider,
    model: input.model,
    projectPath: input.projectPath,
    createdAt,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCachedTokens: 0,
    totalReasoningTokens: 0,
    totalToolTimeMs: 0,
    toolCountsJson: {},
  });
}

export async function listSessionsForWallet(
  walletAddress: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ListSessionsResponse> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const offset = Math.max(0, options.offset ?? 0);

  const { rows, total } = await listSessions(walletAddress, limit, offset);

  const sessionsWithPreview = await Promise.all(
    rows.map(async (session) => {
      const lastMessage = await loadLatestMessagePreview(session.id);
      return {
        ...session,
        lastMessage,
      };
    }),
  );

  return {
    sessions: sessionsWithPreview,
    pagination: {
      limit,
      offset,
      total,
    },
  };
}

export async function getSessionDetail(
  walletAddress: string,
  sessionId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<SessionDetailResponse> {
  const session = await findSessionById(walletAddress, sessionId);
  ensureSessionOwnership(session);

  const limit = options.limit ?? undefined;
  const offset = options.offset ?? undefined;

  const messages = await getSessionMessages(session.id, limit, offset);

  return {
    session,
    messages,
  };
}

export async function sendChatMessage(
  walletAddress: string,
  sessionId: string,
  input: SendMessageInput,
  options?: { stream?: boolean },
): Promise<SendMessageResult> {
  const session = await findSessionById(walletAddress, sessionId);
  ensureSessionOwnership(session);

  const now = new Date();
  const isStream = Boolean(options?.stream);

  const userMessage = await insertMessage(
    {
      sessionId: session.id,
      role: "user",
      status: "complete",
      agent: "user",
      provider: "user",
      model: "user",
      createdAt: now,
      completedAt: now,
    },
    [
      {
        index: 0,
        type: "text",
        content: {
          type: "text",
          text: input.content,
        },
        agent: "user",
        provider: "user",
        model: "user",
        stepIndex: null,
      },
    ],
  );

  // Refresh conversation, including newest user message
  const conversation = await getSessionMessages(session.id);
  const providerMessages = serializeMessagesForProvider(conversation);

  const startTime = Date.now();

  try {
    let assistantMessage: ChatMessage | null = null;

    if (session.provider === "openai") {
      const result = await handleOpenAI(
        walletAddress,
        {
          model: session.model,
          messages: providerMessages,
        },
        { stream: isStream, responseFormat: "completion" },
      );

      if (result.type === "stream") {
        let fullContent = "";
        const streamIterator = result.stream;

        const tapStream = async function* () {
          for await (const chunk of streamIterator) {
            fullContent += chunk;
            yield chunk;
          }
        };

        return {
          type: "stream",
          userMessage,
          stream: tapStream(),
          finalize: async () => {
            const metadata = await result.finalize();
            if (!metadata) {
              throw new Error("Failed to finalize stream");
            }

            const assistantCreatedAt = new Date();
            const latency = Date.now() - startTime;

            const assistantMessage = await insertMessage(
              {
                sessionId: session.id,
                role: "assistant",
                status: "complete",
                agent: session.agent,
                provider: session.provider,
                model: session.model,
                createdAt: assistantCreatedAt,
                completedAt: assistantCreatedAt,
                latencyMs: latency,
                promptTokens: metadata.usage.inputTokens,
                completionTokens: metadata.usage.outputTokens,
                totalTokens: metadata.usage.totalTokens,
              },
              [
                {
                  index: 0,
                  type: "text",
                  content: {
                    type: "text",
                    text: fullContent,
                  },
                  agent: session.agent,
                  provider: session.provider,
                  model: session.model,
                  stepIndex: null,
                },
              ],
            );

            const totalInputTokens =
              (session.totalInputTokens ?? 0) + metadata.usage.inputTokens;
            const totalOutputTokens =
              (session.totalOutputTokens ?? 0) + metadata.usage.outputTokens;
            const totalToolTimeMs = (session.totalToolTimeMs ?? 0) + latency;

            await updateSessionActivity(session.id, assistantCreatedAt, {
              totalInputTokens,
              totalOutputTokens,
              totalCachedTokens: session.totalCachedTokens ?? null,
              totalReasoningTokens: session.totalReasoningTokens ?? null,
              totalToolTimeMs,
              toolCounts: session.toolCounts ?? null,
            });

            if (!session.title) {
              // Note: generating title requires another LLM call, we skip it in finalize for speed/cost or do it?
              // The original code does it. Let's try to do it if possible, but maybe async?
              // For now, let's keep it synchronous to the finalize call.
              const title = await generateSessionTitle(walletAddress, session, [
                ...providerMessages,
                { role: "assistant", content: fullContent },
              ]);
              if (title) {
                await updateSessionTitle(session.id, title);
                session.title = title;
              }
            }

            const updatedSession: ChatSession = {
              ...session,
              totalInputTokens,
              totalOutputTokens,
              totalToolTimeMs,
              lastActiveAt: assistantCreatedAt.toISOString(),
            };

            return {
              session: updatedSession,
              assistantMessage,
              usage: {
                promptTokens: metadata.usage.inputTokens,
                completionTokens: metadata.usage.outputTokens,
                totalTokens: metadata.usage.totalTokens,
                costUsd: metadata.cost,
                balanceRemaining: metadata.newBalance,
              },
            };
          },
        };
      }

      const rawResponse = (result.response ?? {}) as any;
      const choices = Array.isArray(rawResponse.choices)
        ? rawResponse.choices
        : [];
      const firstChoice: any = choices[0] ?? {};
      const content =
        typeof firstChoice?.message?.content === "string"
          ? firstChoice.message.content
          : typeof firstChoice?.delta?.content === "string"
            ? firstChoice.delta.content
            : typeof firstChoice?.text === "string"
              ? firstChoice.text
              : "";

      const usageTotals = rawResponse.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const usageData = {
        promptTokens: Number(usageTotals.prompt_tokens ?? 0),
        completionTokens: Number(usageTotals.completion_tokens ?? 0),
        totalTokens: Number(usageTotals.total_tokens ?? 0),
        cost: Number((result as any).cost ?? 0),
        newBalance: Number((result as any).newBalance ?? 0),
      };

      const latency = Date.now() - startTime;
      const assistantCreatedAt = new Date();

      assistantMessage = await insertMessage(
        {
          sessionId: session.id,
          role: "assistant",
          status: "complete",
          agent: session.agent,
          provider: session.provider,
          model: session.model,
          createdAt: assistantCreatedAt,
          completedAt: assistantCreatedAt,
          latencyMs: latency,
          promptTokens: usageData.promptTokens,
          completionTokens: usageData.completionTokens,
          totalTokens: usageData.totalTokens,
        },
        [
          {
            index: 0,
            type: "text",
            content: {
              type: "text",
              text: content,
            },
            agent: session.agent,
            provider: session.provider,
            model: session.model,
            stepIndex: null,
          },
        ],
      );

      const totalInputTokens =
        (session.totalInputTokens ?? 0) + usageData.promptTokens;
      const totalOutputTokens =
        (session.totalOutputTokens ?? 0) + usageData.completionTokens;
      const totalToolTimeMs = (session.totalToolTimeMs ?? 0) + latency;

      await updateSessionActivity(session.id, assistantCreatedAt, {
        totalInputTokens,
        totalOutputTokens,
        totalCachedTokens: session.totalCachedTokens ?? null,
        totalReasoningTokens: session.totalReasoningTokens ?? null,
        totalToolTimeMs,
        toolCounts: session.toolCounts ?? null,
      });

      if (!session.title) {
        const title = await generateSessionTitle(walletAddress, session, [
          ...providerMessages,
          { role: "assistant", content },
        ]);
        if (title) {
          await updateSessionTitle(session.id, title);
          session.title = title;
        }
      }

      const updatedSession: ChatSession = {
        ...session,
        totalInputTokens,
        totalOutputTokens,
        totalToolTimeMs,
        lastActiveAt: assistantCreatedAt.toISOString(),
      };

      return {
        session: updatedSession,
        userMessage,
        assistantMessage,
        usage: {
          promptTokens: usageData.promptTokens,
          completionTokens: usageData.completionTokens,
          totalTokens: usageData.totalTokens,
          costUsd: usageData.cost,
          balanceRemaining: usageData.newBalance,
        },
      };
    }

    if (session.provider === "anthropic") {
      const result = await handleAnthropic(
        walletAddress,
        {
          model: session.model,
          messages: providerMessages,
        },
        { stream: isStream, responseFormat: "text" },
      );

      if (result.type === "stream") {
        let fullContent = "";
        const streamIterator = result.stream;

        const tapStream = async function* () {
          for await (const chunk of streamIterator) {
            fullContent += chunk;
            yield chunk;
          }
        };

        return {
          type: "stream",
          userMessage,
          stream: tapStream(),
          finalize: async () => {
            const metadata = await result.finalize();
            if (!metadata) {
              throw new Error("Failed to finalize stream");
            }

            const assistantCreatedAt = new Date();
            const latency = Date.now() - startTime;

            const assistantMessage = await insertMessage(
              {
                sessionId: session.id,
                role: "assistant",
                status: "complete",
                agent: session.agent,
                provider: session.provider,
                model: session.model,
                createdAt: assistantCreatedAt,
                completedAt: assistantCreatedAt,
                latencyMs: latency,
                promptTokens: metadata.usage.inputTokens,
                completionTokens: metadata.usage.outputTokens,
                totalTokens: metadata.usage.totalTokens,
              },
              [
                {
                  index: 0,
                  type: "text",
                  content: {
                    type: "text",
                    text: fullContent,
                  },
                  agent: session.agent,
                  provider: session.provider,
                  model: session.model,
                  stepIndex: null,
                },
              ],
            );

            const totalInputTokens =
              (session.totalInputTokens ?? 0) + metadata.usage.inputTokens;
            const totalOutputTokens =
              (session.totalOutputTokens ?? 0) + metadata.usage.outputTokens;
            const totalToolTimeMs = (session.totalToolTimeMs ?? 0) + latency;

            await updateSessionActivity(session.id, assistantCreatedAt, {
              totalInputTokens,
              totalOutputTokens,
              totalCachedTokens: session.totalCachedTokens ?? null,
              totalReasoningTokens: session.totalReasoningTokens ?? null,
              totalToolTimeMs,
              toolCounts: session.toolCounts ?? null,
            });

            if (!session.title) {
              const title = await generateSessionTitle(walletAddress, session, [
                ...providerMessages,
                { role: "assistant", content: fullContent },
              ]);
              if (title) {
                await updateSessionTitle(session.id, title);
                session.title = title;
              }
            }

            const updatedSession: ChatSession = {
              ...session,
              totalInputTokens,
              totalOutputTokens,
              totalToolTimeMs,
              lastActiveAt: assistantCreatedAt.toISOString(),
            };

            return {
              session: updatedSession,
              assistantMessage,
              usage: {
                promptTokens: metadata.usage.inputTokens,
                completionTokens: metadata.usage.outputTokens,
                totalTokens: metadata.usage.totalTokens,
                costUsd: metadata.cost,
                balanceRemaining: metadata.newBalance,
              },
            };
          },
        };
      }

      const rawResponse = (result.response ?? {}) as any;
      const choices = Array.isArray(rawResponse.choices)
        ? rawResponse.choices
        : [];
      const firstChoice: any = choices[0] ?? {};
      const content =
        typeof firstChoice?.message?.content === "string"
          ? firstChoice.message.content
          : typeof firstChoice?.delta?.content === "string"
            ? firstChoice.delta.content
            : typeof firstChoice?.text === "string"
              ? firstChoice.text
              : "";

      const usageTotals = rawResponse.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const usageData = {
        promptTokens: Number(usageTotals.prompt_tokens ?? 0),
        completionTokens: Number(usageTotals.completion_tokens ?? 0),
        totalTokens: Number(usageTotals.total_tokens ?? 0),
        cost: Number((result as any).cost ?? 0),
        newBalance: Number((result as any).newBalance ?? 0),
      };

      const latency = Date.now() - startTime;
      const assistantCreatedAt = new Date();

      assistantMessage = await insertMessage(
        {
          sessionId: session.id,
          role: "assistant",
          status: "complete",
          agent: session.agent,
          provider: session.provider,
          model: session.model,
          createdAt: assistantCreatedAt,
          completedAt: assistantCreatedAt,
          latencyMs: latency,
          promptTokens: usageData.promptTokens,
          completionTokens: usageData.completionTokens,
          totalTokens: usageData.totalTokens,
        },
        [
          {
            index: 0,
            type: "text",
            content: {
              type: "text",
              text: content,
            },
            agent: session.agent,
            provider: session.provider,
            model: session.model,
            stepIndex: null,
          },
        ],
      );

      const totalInputTokens =
        (session.totalInputTokens ?? 0) + usageData.promptTokens;
      const totalOutputTokens =
        (session.totalOutputTokens ?? 0) + usageData.completionTokens;
      const totalToolTimeMs = (session.totalToolTimeMs ?? 0) + latency;

      await updateSessionActivity(session.id, assistantCreatedAt, {
        totalInputTokens,
        totalOutputTokens,
        totalCachedTokens: session.totalCachedTokens ?? null,
        totalReasoningTokens: session.totalReasoningTokens ?? null,
        totalToolTimeMs,
        toolCounts: session.toolCounts ?? null,
      });

      if (!session.title) {
        const title = await generateSessionTitle(walletAddress, session, [
          ...providerMessages,
          { role: "assistant", content },
        ]);
        if (title) {
          await updateSessionTitle(session.id, title);
          session.title = title;
        }
      }

      const updatedSession: ChatSession = {
        ...session,
        totalInputTokens,
        totalOutputTokens,
        totalToolTimeMs,
        lastActiveAt: assistantCreatedAt.toISOString(),
      };

      return {
        session: updatedSession,
        userMessage,
        assistantMessage,
        usage: {
          promptTokens: usageData.promptTokens,
          completionTokens: usageData.completionTokens,
          totalTokens: usageData.totalTokens,
          costUsd: usageData.cost,
          balanceRemaining: usageData.newBalance,
        },
      };
    }

    throw new Error(`Unsupported provider: ${session.provider}`);
  } catch (error) {
    const assistantCreatedAt = new Date();
    const assistantMessage = await insertMessage(
      {
        sessionId: session.id,
        role: "assistant",
        status: "error",
        agent: session.agent,
        provider: session.provider,
        model: session.model,
        createdAt: assistantCreatedAt,
        completedAt: assistantCreatedAt,
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: "api_error",
        errorDetails:
          error && typeof error === "object"
            ? { message: (error as Error).message }
            : null,
      },
      [],
    );

    await updateSessionActivity(session.id, assistantCreatedAt);

    throw Object.assign(error instanceof Error ? error : new Error("Chat failed"), {
      userMessage,
      assistantMessage,
    });
  }
}
