import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { config } from "../config";
import { deductCost } from "../services/balance-manager";
import {
  createChatStream,
  mapFinishReason,
  resolveUsage,
  type UsageTotals,
} from "./anthropic-utils";

interface HandleAnthropicOptions {
  stream: boolean;
}

const anthropic = createAnthropic({
  apiKey: config.anthropic.apiKey,
});

type StreamFinalizeResult = {
  usage: UsageTotals;
  cost: number;
  newBalance: number;
  finishReason: string;
  completionId: string;
  model: string;
  created: number;
  finalEventPayload: any;
};

const CHAT_OBJECT = "chat.completion";

export async function handleAnthropic(
  walletAddress: string,
  body: any,
  options: HandleAnthropicOptions,
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
    const completionId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (!result.textStream) {
      throw new Error("Anthropic did not provide a stream");
    }

    const streamPayload = createChatStream(result.textStream, {
      completionId,
      created,
      model: body.model,
    });

    return {
      stream: streamPayload,
      type: "stream" as const,
      finalize: async (): Promise<StreamFinalizeResult | null> => {
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

          const mappedFinishReason = mapFinishReason(finishReason);
          const { cost, newBalance } = await deductCost(
            walletAddress,
            "anthropic",
            body.model,
            {
              inputTokens: totals.inputTokens,
              outputTokens: totals.outputTokens,
              totalTokens: totals.totalTokens,
            },
            config.markup,
          );

          return {
            usage: totals,
            cost,
            newBalance,
            finishReason: mappedFinishReason,
            completionId,
            model: body.model,
            created,
            finalEventPayload: {
              id: completionId,
              object: "chat.completion.chunk",
              created,
              model: body.model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: mappedFinishReason,
                },
              ],
            },
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

  const mappedFinishReason = mapFinishReason(finishReason);
  const created = Math.floor(Date.now() / 1000);

  const { cost, newBalance } = await deductCost(
    walletAddress,
    "anthropic",
    body.model,
    {
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      totalTokens: totals.totalTokens,
    },
    config.markup,
  );

  const anthropicResponse = {
    id: `msg-${Date.now()}`,
    object: CHAT_OBJECT,
    created,
    model: body.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
        },
        finish_reason: mappedFinishReason,
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
