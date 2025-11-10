import { config } from "../config";
import { deductCost } from "../services/balance-manager";

type OpenAIResponseFormat = "chat" | "completion";

interface HandleOpenAIOptions {
  stream: boolean;
  responseFormat?: OpenAIResponseFormat;
}

type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
};

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const RESPONSES_MODEL_PREFIXES = [
  "gpt-4.1",
  "gpt-4.5",
  "gpt-5",
  "o1",
  "o3",
  "o4",
  "o5",
  "codex",
  "computer",
];
const RESPONSES_MODEL_EXACT = new Set([
  "o1-mini",
  "o1-preview",
  "o1",
  "o3-mini",
  "o4-mini",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o-search-preview",
  "gpt-4o-mini-search-preview",
]);

function shouldUseResponsesEndpoint(model: unknown): boolean {
  if (typeof model !== "string" || !model.length) {
    return false;
  }
  if (RESPONSES_MODEL_EXACT.has(model)) {
    return true;
  }
  return RESPONSES_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

function isResponsesOnlyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const status = (error as any).status;
  const details = (error as any).details;
  const message =
    details?.error?.message ??
    details?.message ??
    (error as Error).message ??
    "";
  if (typeof message !== "string") {
    return false;
  }
  return status === 404 && /v1\/responses/i.test(message);
}

type StreamMode = "passthrough" | "text";

type StreamFinalizeResult = {
  usage: UsageTotals;
  cost: number;
  newBalance: number;
  finishReason: string;
  completionId: string;
  model: string;
  created: number;
  finalEventPayload?: any;
  rawFinalEvent?: string;
};

type StreamResult = {
  type: "stream";
  stream: AsyncIterable<string>;
  finalize: () => Promise<StreamFinalizeResult | null>;
};

type CompleteResult = {
  type: "complete";
  response: any;
  cost: number;
  newBalance: number;
};

type ResponsesStreamState = {
  usage: UsageTotals | null;
  finishReason: string | null;
  completionId: string | null;
  model: string | null;
  created: number | null;
  hasToolCall: boolean;
  roleSent: boolean;
  toolCallCounter: number;
  toolCallByItemId: Map<
    string,
    {
      id: string;
      name: string;
      index: number;
    }
  >;
};

function normalizeUsage(usage: any): UsageTotals | null {
  if (!usage || typeof usage !== "object") {
    return null;
  }

  const prompt =
    typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : typeof usage.input_tokens === "number"
        ? usage.input_tokens
        : typeof usage.promptTokens === "number"
          ? usage.promptTokens
          : typeof usage.inputTokens === "number"
            ? usage.inputTokens
            : undefined;

  const completion =
    typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : typeof usage.output_tokens === "number"
        ? usage.output_tokens
        : typeof usage.completionTokens === "number"
          ? usage.completionTokens
          : typeof usage.outputTokens === "number"
            ? usage.outputTokens
            : undefined;

  const total =
    typeof usage.total_tokens === "number"
      ? usage.total_tokens
      : typeof usage.totalTokens === "number"
        ? usage.totalTokens
        : typeof prompt === "number" && typeof completion === "number"
          ? prompt + completion
          : typeof usage.input_tokens === "number" && typeof usage.output_tokens === "number"
            ? usage.input_tokens + usage.output_tokens
            : undefined;

  if (typeof total !== "number" || !Number.isFinite(total)) {
    return null;
  }

  const resolvedPrompt =
    typeof prompt === "number" && Number.isFinite(prompt) ? prompt : undefined;
  const resolvedCompletion =
    typeof completion === "number" && Number.isFinite(completion)
      ? completion
      : undefined;

  const inputTokens =
    resolvedPrompt ?? (resolvedCompletion != null ? total - resolvedCompletion : total);
  const outputTokens =
    resolvedCompletion ?? (resolvedPrompt != null ? total - resolvedPrompt : total);

  const cachedTokens =
    typeof usage.cached_tokens === "number"
      ? usage.cached_tokens
      : typeof usage.input_tokens_details?.cached_tokens === "number"
        ? usage.input_tokens_details.cached_tokens
        : typeof usage.cachedInputTokens === "number"
          ? usage.cachedInputTokens
          : undefined;

  const sanitizedCached =
    cachedTokens != null && Number.isFinite(cachedTokens)
      ? Math.max(0, Math.round(cachedTokens))
      : undefined;

  return {
    inputTokens: Math.max(0, Math.round(inputTokens)),
    outputTokens: Math.max(0, Math.round(outputTokens)),
    totalTokens: Math.max(0, Math.round(total)),
    cachedTokens: sanitizedCached,
  };
}

function ensureUsageForCost(totals: UsageTotals | null): UsageTotals {
  if (!totals) {
    throw new Error("Missing usage data from OpenAI response");
  }
  return totals;
}

function mapUsageForBilling(totals: UsageTotals) {
  return {
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    totalTokens: totals.totalTokens,
    cachedInputTokens: totals.cachedTokens ?? 0,
  };
}

function prepareHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.openai.apiKey}`,
  };
}

function withUsageStreamOptions(streamOptions: any) {
  const normalized =
    streamOptions && typeof streamOptions === "object" ? { ...streamOptions } : {};

  if (normalized.include_usage !== true) {
    normalized.include_usage = true;
  }

  return normalized;
}

type StreamState = {
  usage: UsageTotals | null;
  finishReason: string | null;
  completionId: string | null;
  model: string | null;
  created: number | null;
  pendingFinalEvent?: {
    parsed: any;
    raw: string;
  };
};

function extractTextContent(choice: any): string {
  if (!choice) {
    return "";
  }

  const source = choice.delta ?? choice.message ?? choice;
  const content = source?.content ?? source?.text ?? source?.output_text;

  const render = (value: any): string => {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(render).join("");
    }
    if (value && typeof value === "object") {
      if (typeof value.text === "string") {
        return value.text;
      }
      if ("content" in value) {
        return render((value as any).content);
      }
    }
    return "";
  };

  return render(content ?? "");
}

function processParsedEvent(
  parsed: any,
  state: StreamState,
): { isFinal: boolean } {
  if (parsed && typeof parsed === "object") {
    if (typeof parsed.id === "string") {
      state.completionId = parsed.id;
    }
    if (typeof parsed.model === "string") {
      state.model = parsed.model;
    }
    if (typeof parsed.created === "number") {
      state.created = parsed.created;
    }
    const usageTotals = normalizeUsage(parsed.usage);
    if (usageTotals) {
      state.usage = usageTotals;
    }

    if (Array.isArray(parsed.choices)) {
      for (const choice of parsed.choices) {
        if (choice && typeof choice.finish_reason === "string") {
          state.finishReason = choice.finish_reason;
          return { isFinal: true };
        }
      }
    }
  }

  return { isFinal: false };
}

function createStreamIterator(
  response: Response,
  mode: StreamMode,
  state: StreamState,
) {
  if (!response.body) {
    throw new Error("OpenAI response did not include a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  const iterator = {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      let buffer = "";
      const queue: string[] = [];

      const emit = (value: string) => {
        queue.push(value);
      };

      const handleEvent = (rawEvent: string) => {
        const cleaned = rawEvent.replace(/\r/g, "");
        const trimmed = cleaned.trim();
        if (!trimmed) {
          return;
        }

        const dataPayload = cleaned
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");

        if (!dataPayload) {
          return;
        }

        if (dataPayload === "[DONE]") {
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(dataPayload);
        } catch {
          return;
        }

        const { isFinal } = processParsedEvent(parsed, state);

        if (mode === "passthrough") {
          if (isFinal) {
            state.pendingFinalEvent = {
              parsed,
              raw: `${cleaned}\n\n`,
            };
            return;
          }
          emit(`${cleaned}\n\n`);
          return;
        }

        const text = Array.isArray(parsed.choices)
          ? parsed.choices.map(extractTextContent).join("")
          : "";

        if (text) {
          emit(text);
        }
      };

      const flushBuffer = (force = false) => {
        while (true) {
          const separatorIndex = buffer.indexOf("\n\n");
          if (separatorIndex === -1) {
            break;
          }

          const eventChunk = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          handleEvent(eventChunk);
        }

        if (force && buffer.trim().length > 0) {
          handleEvent(buffer);
          buffer = "";
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          flushBuffer();
          while (queue.length > 0) {
            const chunk = queue.shift();
            if (chunk != null) {
              yield chunk;
            }
          }
        }

        buffer += decoder.decode(new Uint8Array(), { stream: false });
        flushBuffer(true);

        while (queue.length > 0) {
          const chunk = queue.shift();
          if (chunk != null) {
            yield chunk;
          }
        }
      } finally {
        reader.releaseLock?.();
      }
    },
  };

  return iterator as AsyncIterable<string>;
}

async function handleStreamingChatResponse(
  walletAddress: string,
  body: any,
  responseFormat: OpenAIResponseFormat,
  response: Response,
): Promise<StreamResult> {
  const mode: StreamMode = responseFormat === "chat" ? "passthrough" : "text";
  const streamState: StreamState = {
    usage: null,
    finishReason: null,
    completionId: null,
    model: null,
    created: null,
  };

  const stream = createStreamIterator(response, mode, streamState);

  return {
    type: "stream",
    stream,
    finalize: async () => {
      try {
        const usageTotals = ensureUsageForCost(streamState.usage);
        const { cost, newBalance } = await deductCost(
          walletAddress,
          "openai",
          body.model,
          mapUsageForBilling(usageTotals),
          config.markup,
        );

        return {
          usage: usageTotals,
          cost,
          newBalance,
          finishReason: streamState.finishReason ?? "stop",
          completionId: streamState.completionId ?? `chatcmpl-${Date.now()}`,
          model: streamState.model ?? body.model,
          created: streamState.created ?? Math.floor(Date.now() / 1000),
          finalEventPayload: streamState.pendingFinalEvent?.parsed,
          rawFinalEvent: streamState.pendingFinalEvent?.raw,
        };
      } catch (error) {
        console.error("Failed to finalize OpenAI stream:", error);
        return null;
      }
    },
  };
}

function convertChatToCompletionResponse(chatResponse: any) {
  const created =
    typeof chatResponse?.created === "number"
      ? chatResponse.created
      : Math.floor(Date.now() / 1000);

  const choice = Array.isArray(chatResponse?.choices)
    ? chatResponse.choices[0]
    : undefined;

  const finishReason = choice?.finish_reason ?? "stop";
  const textContent = extractTextContent(choice ?? {});

  return {
    id: chatResponse?.id ?? `cmpl-${Date.now()}`,
    object: "text_completion",
    created,
    model: chatResponse?.model ?? "",
    choices: [
      {
        index: 0,
        text: textContent,
        logprobs: null,
        finish_reason: finishReason,
      },
    ],
    usage: chatResponse?.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

async function readJSON(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text || "Unknown error from OpenAI" } };
  }
}

function formatOpenAIError(status: number, body: any) {
  const message =
    body?.error?.message ??
    body?.message ??
    body?.error ??
    "Unknown error from OpenAI";

  const error = new Error(
    `OpenAI request failed with status ${status}: ${message}`,
  );
  (error as any).status = status;
  (error as any).details = body;
  return error;
}

async function requestOpenAIChat(payload: any) {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: prepareHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await readJSON(response);
    throw formatOpenAIError(response.status, body);
  }

  return response;
}

export async function handleOpenAI(
  walletAddress: string,
  body: any,
  options: HandleOpenAIOptions,
): Promise<StreamResult | CompleteResult> {
  if (shouldUseResponsesEndpoint(body?.model)) {
    return handleResponsesModel(walletAddress, body, options);
  }

  try {
    return await handleChatCompletionModel(walletAddress, body, options);
  } catch (error) {
    if (isResponsesOnlyError(error)) {
      return handleResponsesModel(walletAddress, body, options);
    }
    throw error;
  }
}

async function handleChatCompletionModel(
  walletAddress: string,
  body: any,
  options: HandleOpenAIOptions,
): Promise<StreamResult | CompleteResult> {
  const { stream, responseFormat = "chat" } = options;

  if (stream) {
    const payload = {
      ...body,
      stream: true,
      stream_options: withUsageStreamOptions(body.stream_options),
    };

    const response = await requestOpenAIChat(payload);
    return handleStreamingChatResponse(walletAddress, body, responseFormat, response);
  }

  const payload = {
    ...body,
    stream: false,
  };

  const response = await requestOpenAIChat(payload);
  const json = await response.json();

  const usageTotals = ensureUsageForCost(normalizeUsage(json.usage));
  const { cost, newBalance } = await deductCost(
    walletAddress,
    "openai",
    body.model,
    mapUsageForBilling(usageTotals),
    config.markup,
  );

  const formattedResponse =
    responseFormat === "completion" ? convertChatToCompletionResponse(json) : json;

  return {
    type: "complete",
    response: formattedResponse,
    cost,
    newBalance,
  };
}

async function handleResponsesModel(
  walletAddress: string,
  body: any,
  options: HandleOpenAIOptions,
): Promise<StreamResult | CompleteResult> {
  const { stream, responseFormat = "chat" } = options;

  if (stream) {
    const payload = {
      ...buildResponsesPayload(body),
      stream: true,
    };

    const response = await requestOpenAIResponse(payload);
    return handleStreamingResponsesResponse(walletAddress, body, responseFormat, response);
  }

  const payload = {
    ...buildResponsesPayload(body),
    stream: false,
  };

  const response = await requestOpenAIResponse(payload);
  const json = await response.json();

  const { chatResponse, usageTotals } = convertResponsesJsonToChatResponse(json, body.model);
  const formattedResponse =
    responseFormat === "completion" ? convertChatToCompletionResponse(chatResponse) : chatResponse;

  const { cost, newBalance } = await deductCost(
    walletAddress,
    "openai",
    body.model,
    mapUsageForBilling(usageTotals),
    config.markup,
  );

  return {
    type: "complete",
    response: formattedResponse,
    cost,
    newBalance,
  };
}

async function handleStreamingResponsesResponse(
  walletAddress: string,
  body: any,
  responseFormat: OpenAIResponseFormat,
  response: Response,
): Promise<StreamResult> {
  const mode: StreamMode = responseFormat === "chat" ? "passthrough" : "text";
  const streamState: ResponsesStreamState = {
    usage: null,
    finishReason: null,
    completionId: null,
    model: null,
    created: null,
    hasToolCall: false,
    roleSent: false,
    toolCallCounter: 0,
    toolCallByItemId: new Map(),
  };

  const stream = createResponsesStreamIterator(response, mode, streamState, body.model);

  return {
    type: "stream",
    stream,
    finalize: async () => {
      try {
        const usageTotals = ensureUsageForCost(streamState.usage);
        const { cost, newBalance } = await deductCost(
          walletAddress,
          "openai",
          body.model,
          mapUsageForBilling(usageTotals),
          config.markup,
        );

        const completionId = streamState.completionId ?? `chatcmpl-${Date.now()}`;
        const created = streamState.created ?? Math.floor(Date.now() / 1000);
        const model = streamState.model ?? body.model;
        const finishReason = streamState.finishReason ?? (streamState.hasToolCall ? "tool_calls" : "stop");

        const finalChunk =
          mode === "passthrough"
            ? {
                id: completionId,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: finishReason,
                  },
                ],
              }
            : undefined;

        return {
          usage: usageTotals,
          cost,
          newBalance,
          finishReason,
          completionId,
          model,
          created,
          finalEventPayload: finalChunk,
        };
      } catch (error) {
        console.error("Failed to finalize OpenAI responses stream:", error);
        return null;
      }
    },
  };
}

function normalizeMessageContentForResponses(content: any) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const normalized = content
      .map((part) => {
        if (!part) {
          return "";
        }
        if (typeof part === "string") {
          return part;
        }
        if (typeof part === "object" && typeof part.text === "string") {
          return part.text;
        }
        if (typeof part === "object" && typeof part.content === "string") {
          return part.content;
        }
        return "";
      })
      .filter((text) => text.length > 0);
    if (normalized.length > 0) {
      return normalized.join("\n");
    }
  }
  return content;
}

function normalizeToolContent(content: any) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) {
          return "";
        }
        if (typeof part === "string") {
          return part;
        }
        if (typeof part === "object" && typeof part.text === "string") {
          return part.text;
        }
        if (typeof part === "object" && typeof part.content === "string") {
          return part.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "object" && content !== null) {
    return JSON.stringify(content);
  }
  return "";
}

function generateFallbackId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function convertMessagesToResponsesInput(messages: any[]) {
  const input: any[] = [];

  for (const rawMessage of messages) {
    if (!rawMessage || typeof rawMessage !== "object") {
      continue;
    }

    const role = rawMessage.role;
    const textContent = normalizeMessageContentForResponses(rawMessage.content ?? "");

    switch (role) {
      case "system":
      case "developer": {
        if (textContent) {
          input.push({
            role,
            content: textContent,
          });
        }
        break;
      }
      case "user": {
        if (textContent) {
          input.push({
            role: "user",
            content: [
              {
                type: "input_text",
                text: textContent,
              },
            ],
          });
        }
        break;
      }
      case "assistant": {
        if (textContent) {
          input.push({
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: textContent,
              },
            ],
          });
        }

        if (Array.isArray(rawMessage.tool_calls)) {
          for (const toolCall of rawMessage.tool_calls) {
            if (!toolCall || typeof toolCall !== "object") {
              continue;
            }
            const functionPayload = toolCall.function ?? {};
            const name =
              typeof functionPayload.name === "string"
                ? functionPayload.name
                : typeof toolCall.name === "string"
                  ? toolCall.name
                  : "function";
            const args = functionPayload.arguments;
            const serializedArgs =
              typeof args === "string"
                ? args
                : args != null
                  ? JSON.stringify(args)
                  : "{}";
            input.push({
              type: "function_call",
              call_id: toolCall.id ?? toolCall.call_id ?? generateFallbackId("call"),
              name,
              arguments: serializedArgs,
            });
          }
        }

        break;
      }
      case "tool": {
        const toolCallId =
          rawMessage.tool_call_id ??
          rawMessage.toolCallId ??
          rawMessage.id ??
          generateFallbackId("tool");
        const outputValue = normalizeToolContent(rawMessage.content);
        input.push({
          type: "function_call_output",
          call_id: toolCallId,
          output: outputValue,
        });
        break;
      }
      default:
        if (textContent) {
          input.push({
            role: "user",
            content: [
              {
                type: "input_text",
                text: textContent,
              },
            ],
          });
        }
        break;
    }
  }

  return input;
}

function convertToolsForResponses(tools: any[] | undefined) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => {
    if (tool && typeof tool === "object" && tool.type === "function" && tool.function) {
      const fn = tool.function;
      return {
        type: "function",
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters ?? tool.parameters,
        strict: tool.strict ?? fn.strict,
      };
    }
    return tool;
  });
}

function convertToolChoiceForResponses(toolChoice: any) {
  if (!toolChoice) {
    return undefined;
  }

  if (typeof toolChoice === "string") {
    return toolChoice;
  }

  if (toolChoice.type === "function") {
    if (typeof toolChoice.function === "string") {
      return { type: "function", name: toolChoice.function };
    }
    if (toolChoice.function && typeof toolChoice.function.name === "string") {
      return { type: "function", name: toolChoice.function.name };
    }
  }

  return toolChoice;
}

function buildResponsesPayload(body: any) {
  const payload = { ...body };

  if (Array.isArray(payload.messages)) {
    payload.input = convertMessagesToResponsesInput(payload.messages);
    delete payload.messages;
  } else if (!payload.input && Array.isArray(body?.messages)) {
    payload.input = convertMessagesToResponsesInput(body.messages);
  }

  if (typeof payload.max_output_tokens !== "number" && typeof payload.max_tokens === "number") {
    payload.max_output_tokens = payload.max_tokens;
    delete payload.max_tokens;
  }

  if (payload.tools) {
    payload.tools = convertToolsForResponses(payload.tools);
  }

  if (payload.tool_choice) {
    payload.tool_choice = convertToolChoiceForResponses(payload.tool_choice);
  }

  return payload;
}

async function requestOpenAIResponse(payload: any) {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: prepareHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await readJSON(response);
    throw formatOpenAIError(response.status, body);
  }

  return response;
}

function convertResponsesJsonToChatResponse(responseJson: any, fallbackModel: string) {
  const created =
    typeof responseJson?.created_at === "number"
      ? Math.floor(responseJson.created_at)
      : Math.floor(Date.now() / 1000);

  let content = "";
  const toolCalls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }> = [];

  if (Array.isArray(responseJson?.output)) {
    for (const entry of responseJson.output) {
      if (!entry || typeof entry !== "object") continue;
      switch (entry.type) {
        case "message": {
          if (Array.isArray(entry.content)) {
            for (const part of entry.content) {
              if (part?.type === "output_text" && typeof part.text === "string") {
                content += part.text;
              }
            }
          }
          break;
        }
        case "function_call": {
          if (
            typeof entry.call_id === "string" &&
            typeof entry.name === "string" &&
            typeof entry.arguments === "string"
          ) {
            toolCalls.push({
              id: entry.call_id,
              type: "function",
              function: {
                name: entry.name,
                arguments: entry.arguments,
              },
            });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  const usageTotals = ensureUsageForCost(normalizeUsage(responseJson?.usage ?? null));
  const hasToolCall = toolCalls.length > 0;
  const finishReason = mapResponsesFinishReason(
    responseJson?.incomplete_details?.reason,
    hasToolCall,
  );

  const chatResponse = {
    id: responseJson?.id ?? `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created,
    model: responseJson?.model ?? fallbackModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: hasToolCall ? "" : content,
          ...(hasToolCall ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: hasToolCall ? "tool_calls" : finishReason,
      },
    ],
    usage: {
      prompt_tokens: usageTotals.inputTokens,
      completion_tokens: usageTotals.outputTokens,
      total_tokens: usageTotals.totalTokens,
    },
  };

  return {
    chatResponse,
    usageTotals,
  };
}

function createResponsesStreamIterator(
  response: Response,
  mode: StreamMode,
  state: ResponsesStreamState,
  defaultModel: string,
) {
  if (!response.body) {
    throw new Error("OpenAI response did not include a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  const emitChunk = (chunk: any) => `data: ${JSON.stringify(chunk)}\n\n`;

  const ensureRoleChunk = () => {
    if (state.roleSent || mode !== "passthrough") {
      return null;
    }
    state.roleSent = true;
    return emitChunk({
      id: state.completionId ?? `chatcmpl-${Date.now()}`,
      object: "chat.completion.chunk",
      created: state.created ?? Math.floor(Date.now() / 1000),
      model: state.model ?? defaultModel,
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
          },
          finish_reason: null,
        },
      ],
    });
  };

  const handleEvent = (parsed: any): string[] => {
    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    const outputs: string[] = [];

    switch (parsed.type) {
      case "response.created": {
        if (parsed.response) {
          state.completionId = parsed.response.id ?? state.completionId;
          state.model = parsed.response.model ?? state.model;
          if (typeof parsed.response.created_at === "number") {
            state.created = Math.floor(parsed.response.created_at);
          }
        }
        break;
      }
      case "response.output_text.delta": {
        if (typeof parsed.delta === "string" && parsed.delta.length > 0) {
          if (mode === "text") {
            outputs.push(parsed.delta);
          } else {
            const roleChunk = ensureRoleChunk();
            if (roleChunk) {
              outputs.push(roleChunk);
            }
            outputs.push(
              emitChunk({
                id: state.completionId ?? `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: state.created ?? Math.floor(Date.now() / 1000),
                model: state.model ?? defaultModel,
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: parsed.delta,
                    },
                    finish_reason: null,
                  },
                ],
              }),
            );
          }
        }
        break;
      }
      case "response.output_item.added": {
        if (
          parsed.item?.type === "function_call" &&
          typeof parsed.item.id === "string" &&
          typeof parsed.item.call_id === "string" &&
          typeof parsed.item.name === "string"
        ) {
          const tracker = {
            id: parsed.item.call_id,
            name: parsed.item.name,
            index: state.toolCallCounter++,
          };
          state.toolCallByItemId.set(parsed.item.id, tracker);
          state.hasToolCall = true;

          if (mode === "passthrough") {
            const roleChunk = ensureRoleChunk();
            if (roleChunk) {
              outputs.push(roleChunk);
            }
            outputs.push(
              emitChunk({
                id: state.completionId ?? `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: state.created ?? Math.floor(Date.now() / 1000),
                model: state.model ?? defaultModel,
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          index: tracker.index,
                          id: tracker.id,
                          type: "function",
                          function: {
                            name: tracker.name,
                            arguments: "",
                          },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              }),
            );
          }
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const tracker = state.toolCallByItemId.get(parsed.item_id);
        if (
          tracker &&
          typeof parsed.delta === "string" &&
          parsed.delta.length > 0 &&
          mode === "passthrough"
        ) {
          const roleChunk = ensureRoleChunk();
          if (roleChunk) {
            outputs.push(roleChunk);
          }
          outputs.push(
            emitChunk({
              id: state.completionId ?? `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: state.created ?? Math.floor(Date.now() / 1000),
              model: state.model ?? defaultModel,
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      {
                        index: tracker.index,
                        id: tracker.id,
                        type: "function",
                        function: {
                          name: tracker.name,
                          arguments: parsed.delta,
                        },
                      },
                    ],
                  },
                  finish_reason: null,
                },
              ],
            }),
          );
        }
        break;
      }
      case "response.completed":
      case "response.incomplete": {
        if (parsed.response) {
          state.completionId = parsed.response.id ?? state.completionId;
          state.model = parsed.response.model ?? state.model;
          if (typeof parsed.response.created_at === "number") {
            state.created = Math.floor(parsed.response.created_at);
          }
          state.usage = normalizeUsage(parsed.response.usage);
          state.finishReason = mapResponsesFinishReason(
            parsed.response.incomplete_details?.reason,
            state.hasToolCall,
          );
        }
        break;
      }
      default:
        break;
    }

    return outputs;
  };

  const iterator = {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      let buffer = "";
      const queue: string[] = [];

      const flushBuffer = (force = false) => {
        while (true) {
          const separatorIndex = buffer.indexOf("\n\n");
          if (separatorIndex === -1) {
            break;
          }
          const eventChunk = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          const lines = eventChunk.split("\n");
          const dataLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
          const dataPayload = dataLines.join("\n");
          if (!dataPayload || dataPayload === "[DONE]") {
            continue;
          }
          try {
            const parsed = JSON.parse(dataPayload);
            const emitted = handleEvent(parsed);
            if (emitted.length > 0) {
              queue.push(...emitted);
            }
          } catch {
            continue;
          }
        }

        if (force && buffer.trim().length > 0) {
          try {
            const parsed = JSON.parse(buffer);
            const emitted = handleEvent(parsed);
            if (emitted.length > 0) {
              queue.push(...emitted);
            }
          } catch {
            // ignore
          }
          buffer = "";
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          flushBuffer();
          while (queue.length > 0) {
            const chunk = queue.shift();
            if (chunk != null) {
              yield chunk;
            }
          }
        }
        buffer += decoder.decode(new Uint8Array(), { stream: false });
        flushBuffer(true);
        while (queue.length > 0) {
          const chunk = queue.shift();
          if (chunk != null) {
            yield chunk;
          }
        }
      } finally {
        reader.releaseLock?.();
      }
    },
  };

  return iterator as AsyncIterable<string>;
}

function mapResponsesFinishReason(reason: string | null | undefined, hasToolCall: boolean) {
  if (reason == null) {
    return hasToolCall ? "tool_calls" : "stop";
  }
  switch (reason) {
    case "max_output_tokens":
      return "length";
    case "content_filter":
      return "content_filter";
    default:
      return hasToolCall ? "tool_calls" : "unknown";
  }
}
