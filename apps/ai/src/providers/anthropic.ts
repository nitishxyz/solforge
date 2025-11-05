import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { config } from "../config";
import { deductCost } from "../services/balance-manager";

interface HandleAnthropicOptions {
  stream: boolean;
}

const anthropic = createAnthropic({
  apiKey: config.anthropic.apiKey,
});

type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function resolveUsage(
  usage: Awaited<ReturnType<typeof streamText>>["usage"],
  steps: Awaited<ReturnType<typeof streamText>>["steps"] | undefined,
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

export async function handleAnthropic(
  walletAddress: string,
  body: any,
  options: HandleAnthropicOptions
) {
  const { stream } = options;

  const temperature =
    typeof body.temperature === "number" ? body.temperature : undefined;
  const maxOutputTokens =
    typeof body.max_tokens === "number" ? body.max_tokens : 4096;

  const result = streamText({
    model: anthropic(body.model),
    messages: body.messages,
    temperature,
    maxOutputTokens,
  });

  if (stream) {
    return {
      stream: result.textStream,
      type: "stream" as const,
      finalize: async () => {
        try {
          const [usage, finishReason, steps] = await Promise.all([
            result.usage,
            result.finishReason,
            result.steps.catch(() => undefined),
          ]);

          const totals = resolveUsage(usage, steps);
          if (!totals) {
            return null;
          }

          const { cost, newBalance } = await deductCost(
            walletAddress,
            "anthropic",
            body.model,
            {
              inputTokens: totals.inputTokens,
              outputTokens: totals.outputTokens,
              totalTokens: totals.totalTokens,
            },
            config.markup
          );

          return {
            usage: totals,
            cost,
            newBalance,
            finishReason: finishReason ?? "stop",
          };
        } catch (error) {
          console.error("Failed to finalize Anthropic stream:", error);
          return null;
        }
      },
    };
  }

  const [text, usage, finishReason, steps] = await Promise.all([
    result.text,
    result.usage,
    result.finishReason,
    result.steps.catch(() => []),
  ]);

  const totals = resolveUsage(usage, steps);
  if (!totals) {
    throw new Error("No usage data returned from Anthropic");
  }

  const { cost, newBalance } = await deductCost(
    walletAddress,
    "anthropic",
    body.model,
    {
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      totalTokens: totals.totalTokens,
    },
    config.markup
  );

  const anthropicResponse = {
    id: `msg-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
        finish_reason: finishReason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: totals.inputTokens,
      completion_tokens: totals.outputTokens,
      total_tokens: totals.totalTokens,
    },
  };

  return {
    response: anthropicResponse,
    cost,
    newBalance,
    type: "complete",
  };
}
