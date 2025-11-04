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
    result = await handleOpenAI(walletAddress, body, isStream);
  } else if (model.startsWith("claude-")) {
    result = await handleAnthropic(walletAddress, body, isStream);
  } else {
    return c.json({ error: "Unsupported model" }, 400);
  }

  if (result.type === "stream" && result.stream) {
    return stream(c, async (stream) => {
      for await (const chunk of result.stream) {
        const sseData = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
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
