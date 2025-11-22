export type MessageRole = "system" | "user" | "assistant" | "tool";
export type MessageStatus = "pending" | "complete" | "error";
export type MessagePartType = "text" | "tool_call" | "tool_result" | "image" | "error";

export interface ChatMessagePartContent {
  type: MessagePartType;
  text?: string;
  data?: Record<string, unknown>;
}

export interface ChatMessagePart {
  id: string;
  messageId: string;
  index: number;
  stepIndex: number | null;
  type: MessagePartType;
  content: ChatMessagePartContent;
  agent: string;
  provider: string;
  model: string;
  startedAt: string | null;
  completedAt: string | null;
  toolName: string | null;
  toolCallId: string | null;
  toolDurationMs: number | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  status: MessageStatus;
  agent: string;
  provider: string;
  model: string;
  createdAt: string;
  completedAt: string | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens: number | null;
  reasoningTokens: number | null;
  error: string | null;
  errorType: string | null;
  errorDetails: Record<string, unknown> | null;
  isAborted: boolean | null;
  parts: ChatMessagePart[];
}

export interface ChatSession {
  id: string;
  walletAddress: string;
  title: string | null;
  agent: string;
  provider: string;
  model: string;
  projectPath: string;
  createdAt: string;
  lastActiveAt: string | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  totalCachedTokens: number | null;
  totalReasoningTokens: number | null;
  totalToolTimeMs: number | null;
  toolCounts: Record<string, number> | null;
}

export interface ChatSessionSummary extends ChatSession {
  lastMessage?: Pick<
    ChatMessage,
    "id" | "role" | "status" | "createdAt"
  > & { preview: string | null };
}

export interface ListSessionsResponse {
  sessions: ChatSessionSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface SessionDetailResponse {
  session: ChatSession;
  messages: ChatMessage[];
}

export type SendMessageResult =
  | {
      type?: "complete";
      session: ChatSession;
      userMessage: ChatMessage;
      assistantMessage: ChatMessage | null;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
        balanceRemaining: number;
      };
    }
  | {
      type: "stream";
      userMessage: ChatMessage;
      stream: AsyncIterable<string>;
      finalize: () => Promise<{
        session: ChatSession;
        assistantMessage: ChatMessage;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          costUsd: number;
          balanceRemaining: number;
        };
      }>;
    };
