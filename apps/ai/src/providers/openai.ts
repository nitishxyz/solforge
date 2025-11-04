import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { config } from "../config";
import { deductCost } from "../services/balance-manager";

type OpenAIResponseFormat = "chat" | "completion";

interface HandleOpenAIOptions {
  stream: boolean;
  responseFormat?: OpenAIResponseFormat;
}

const openai = createOpenAI({
  apiKey: config.openai.apiKey,
});

export async function handleOpenAI(
  walletAddress: string,
  body: any,
  options: HandleOpenAIOptions
) {
  const { stream, responseFormat = "chat" } = options;

  const temperature =
    typeof body.temperature === "number" ? body.temperature : undefined;
  const maxOutputTokens =
    typeof body.max_tokens === "number" ? body.max_tokens : undefined;

  const result = streamText({
    model: openai(body.model),
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
            "openai",
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
          console.error("Failed to finalize OpenAI stream:", error);
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
    throw new Error("No usage data returned from OpenAI - check result structure");
  }

  const { cost, newBalance } = await deductCost(
    walletAddress,
    "openai",
    body.model,
    {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
    config.markup
  );

  const created = Math.floor(Date.now() / 1000);

  const response =
    responseFormat === "chat"
      ? {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created,
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
        }
      : {
          id: `cmpl-${Date.now()}`,
          object: "text_completion",
          created,
          model: body.model,
          choices: [
            {
              index: 0,
              text,
              logprobs: null,
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
    response,
    cost,
    newBalance,
    type: "complete",
  };
}
