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
          const [usage, finishReason] = await Promise.all([
            result.usage,
            result.finishReason,
          ]);

          if (
            !usage ||
            usage.inputTokens == null ||
            usage.outputTokens == null ||
            usage.totalTokens == null
          ) {
            return null;
          }

          const { cost, newBalance } = await deductCost(
            walletAddress,
            "anthropic",
            body.model,
            {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            },
            config.markup
          );

          return {
            usage,
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

  const [text, usage, finishReason] = await Promise.all([
    result.text,
    result.usage,
    result.finishReason,
  ]);

  if (
    !usage ||
    usage.inputTokens == null ||
    usage.outputTokens == null ||
    usage.totalTokens == null
  ) {
    throw new Error("No usage data returned from Anthropic");
  }

  const { cost, newBalance } = await deductCost(
    walletAddress,
    "anthropic",
    body.model,
    {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
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
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
    },
  };

  return {
    response: anthropicResponse,
    cost,
    newBalance,
    type: "complete",
  };
}
