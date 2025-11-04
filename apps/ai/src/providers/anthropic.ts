import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { config } from "../config";
import { deductCost } from "../services/balance-manager";

const anthropic = createAnthropic({
  apiKey: config.anthropic.apiKey,
});

export async function handleAnthropic(
  walletAddress: string,
  body: any,
  stream: boolean
) {
  if (stream) {
    const result = await streamText({
      model: anthropic(body.model),
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.max_tokens || 4096,
    });

    return { stream: result.textStream, type: "stream" };
  } else {
    const result = await generateText({
      model: anthropic(body.model),
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.max_tokens || 4096,
    });

    const usage = result.steps?.[0]?.usage;
    
    if (!usage) {
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

    const openAIResponse = {
      id: `msg-${Date.now()}`,
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
