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
    const completionId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);
    return stream(c, async (stream) => {
      for await (const chunk of result.stream) {
        const sseData = {
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model: body.model,
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason: null,
            },
          ],
        };
        await stream.write(`data: ${JSON.stringify(sseData)}\n\n`);
      }
      let finishReason: string | null = null;
      if (typeof result.finalize === "function") {
        const metadata = await result.finalize();
        if (metadata) {
          finishReason = metadata.finishReason ?? "stop";
          const usage = {
            prompt_tokens: metadata.usage.inputTokens,
            completion_tokens: metadata.usage.outputTokens,
            total_tokens: metadata.usage.totalTokens,
          };
          const finalChunk = {
            id: completionId,
            object: "chat.completion.chunk",
            created,
            model: body.model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: finishReason,
              },
            ],
            usage,
            solforge_metadata: {
              balance_remaining: metadata.newBalance.toFixed(8),
              cost_usd: metadata.cost.toFixed(8),
            },
          };
          await stream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        }
      }
      if (!finishReason) {
        const finalChunk = {
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model: body.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        await stream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      }
      await stream.write("data: [DONE]\n\n");
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
