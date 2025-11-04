import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { config } from "../config";
import { deductCost } from "../services/balance-manager";

const openai = createOpenAI({
  apiKey: config.openai.apiKey,
});

export async function handleOpenAI(
  walletAddress: string,
  body: any,
  stream: boolean
) {
  const temperature =
    typeof body.temperature === "number" ? body.temperature : undefined;
  const maxOutputTokens =
    typeof body.max_tokens === "number" ? body.max_tokens : undefined;

  if (stream) {
    const result = await streamText({
      model: openai(body.model),
      messages: body.messages,
      temperature,
      maxOutputTokens,
    });

    return { stream: result.textStream, type: "stream" };
  } else {
    const result = await generateText({
      model: openai(body.model),
      messages: body.messages,
      temperature,
      maxOutputTokens,
    });

    const usage = result.steps?.[0]?.usage;

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

    const openAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      model: body.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.text,
          },
          finish_reason: result.steps?.[0]?.finishReason || "stop",
        },
      ],
      usage: {
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      },
    };

    return {
      response: openAIResponse,
      cost,
      newBalance,
      type: "complete",
    };
  }
}
