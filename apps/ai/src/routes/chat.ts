import { Hono } from "hono";
import { stream } from "hono/streaming";
import { walletAuth } from "../middleware/auth";
import { balanceCheck } from "../middleware/balance-check";
import { handleOpenAI } from "../providers/openai";
import { handleAnthropic } from "../providers/anthropic";

const chat = new Hono<{ Variables: { walletAddress: string } }>();

chat.post("/v1/chat/completions", walletAuth, balanceCheck, async (c) => {
  const walletAddress = c.get("walletAddress") as string;
  const body = (await c.req.json()) as any;

  const isStream = Boolean(body.stream);
  const model = typeof body.model === "string" ? body.model : "";

  if (!model) {
    return c.json({ error: "Model is required" }, 400);
  }

  let result: any;
  if (model.startsWith("gpt-") || model.startsWith("o1-")) {
    result = await handleOpenAI(walletAddress, body, {
      stream: isStream,
      responseFormat: "chat",
    });
  } else if (model.startsWith("claude-")) {
    result = await handleAnthropic(walletAddress, body, {
      stream: isStream,
    });
  } else {
    return c.json({ error: "Unsupported model" }, 400);
  }

  if (result.type === "stream" && result.stream) {
    return stream(c, async (streamWriter) => {
      for await (const chunk of result.stream) {
        await streamWriter.write(chunk);
      }

      let finalChunkWritten = false;

      if (typeof result.finalize === "function") {
        const metadata = await result.finalize();
        if (metadata) {
          finalChunkWritten = true;
          const usage = {
            prompt_tokens: metadata.usage.inputTokens,
            completion_tokens: metadata.usage.outputTokens,
            total_tokens: metadata.usage.totalTokens,
          };

          const basePayload =
            metadata.finalEventPayload && typeof metadata.finalEventPayload === "object"
              ? metadata.finalEventPayload
              : {
                  id: metadata.completionId,
                  object: "chat.completion.chunk",
                  created: metadata.created,
                  model: metadata.model,
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: metadata.finishReason ?? "stop",
                    },
                  ],
                };

          const finalChunk = {
            ...basePayload,
            usage,
            solforge_metadata: {
              balance_remaining: metadata.newBalance.toFixed(8),
              cost_usd: metadata.cost.toFixed(8),
            },
          };

          // Ensure choices reflect the final finish reason.
          if (Array.isArray(finalChunk.choices)) {
            finalChunk.choices = finalChunk.choices.map((choice: any, index: number) => ({
              ...choice,
              index: typeof choice.index === "number" ? choice.index : index,
              finish_reason: metadata.finishReason ?? choice.finish_reason ?? "stop",
            }));
          }

          await streamWriter.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        }
      }

      if (!finalChunkWritten) {
        const fallbackChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: body.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        await streamWriter.write(`data: ${JSON.stringify(fallbackChunk)}\n\n`);
      }

      await streamWriter.write("data: [DONE]\n\n");
    });
  } else {
    const unsafeResult = result as {
      response: any;
      newBalance: number;
      cost: number;
    };
    return c.json(result.response, 200, {
      "x-balance-remaining": unsafeResult.newBalance.toFixed(8),
      "x-cost-usd": unsafeResult.cost.toFixed(8),
    });
  }
});

export default chat;
