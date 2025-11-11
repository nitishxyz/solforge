export type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function resolveUsage(
  usage: any,
  steps: Array<{ usage?: any }> | undefined,
): UsageTotals | null {
  const lastStepUsage = steps && steps.length > 0 ? steps.at(-1)?.usage : undefined;

  const inputTokens =
    usage?.promptTokens ??
    usage?.inputTokens ??
    lastStepUsage?.inputTokens ??
    lastStepUsage?.promptTokens;

  const outputTokens =
    usage?.completionTokens ??
    usage?.outputTokens ??
    lastStepUsage?.outputTokens ??
    lastStepUsage?.completionTokens;

  const totalTokens =
    usage?.totalTokens ??
    lastStepUsage?.totalTokens ??
    (inputTokens != null && outputTokens != null
      ? inputTokens + outputTokens
      : undefined);

  if (totalTokens == null) {
    return null;
  }

  const round = (value: number | undefined) =>
    value != null && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;

  const sanitizedTotal = round(totalTokens);
  if (sanitizedTotal == null) {
    return null;
  }

  const roundedInput = round(inputTokens);
  const roundedOutput = round(outputTokens);

  const sanitizedInput =
    roundedInput ??
    (roundedOutput != null ? Math.max(0, sanitizedTotal - roundedOutput) : sanitizedTotal);

  const sanitizedOutput =
    roundedOutput ??
    (sanitizedInput != null ? Math.max(0, sanitizedTotal - sanitizedInput) : sanitizedTotal);

  return {
    inputTokens: sanitizedInput ?? sanitizedTotal,
    outputTokens: sanitizedOutput ?? sanitizedTotal,
    totalTokens: sanitizedTotal,
  };
}

export function mapFinishReason(reason: string | null | undefined): string {
  switch (reason) {
    case "length":
    case "max_tokens":
      return "length";
    case "stop_sequence":
    case "end_turn":
    case "stop":
    default:
      return "stop";
  }
}

function ensureAsyncIterable<T>(stream: unknown): AsyncIterable<T> {
  if (stream && typeof (stream as AsyncIterable<T>)[Symbol.asyncIterator] === "function") {
    return stream as AsyncIterable<T>;
  }

  if (stream && typeof (stream as { getReader?: () => any }).getReader === "function") {
    return {
      async *[Symbol.asyncIterator]() {
        const reader = (stream as { getReader: () => any }).getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (value != null) {
              yield value;
            }
          }
        } finally {
          reader.releaseLock?.();
        }
      },
    };
  }

  throw new Error("Anthropic stream is not iterable");
}

function formatChunk(
  completionId: string,
  created: number,
  model: string,
  delta: Record<string, unknown>,
  finishReason: string | null = null,
) {
  return `data: ${JSON.stringify({
    id: completionId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  })}\n\n`;
}

export function createChatStream(
  textStream: unknown,
  metadata: { completionId: string; created: number; model: string },
) {
  const iterable = ensureAsyncIterable(textStream);
  return {
    async *[Symbol.asyncIterator](): AsyncIterator<string> {
      let roleSent = false;
      if (!roleSent) {
        roleSent = true;
        yield formatChunk(metadata.completionId, metadata.created, metadata.model, {
          role: "assistant",
        });
      }
      for await (const rawChunk of iterable) {
        const chunk =
          typeof rawChunk === "string"
            ? rawChunk
            : rawChunk != null
              ? String(rawChunk)
              : "";
        if (!chunk) {
          continue;
        }
        yield formatChunk(metadata.completionId, metadata.created, metadata.model, {
          content: chunk,
        });
      }
    },
  };
}
