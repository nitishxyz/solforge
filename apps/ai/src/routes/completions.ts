import { Hono } from "hono";
import { stream } from "hono/streaming";
import { walletAuth } from "../middleware/auth";
import { balanceCheck } from "../middleware/balance-check";
import { handleOpenAI } from "../providers/openai";

const completions = new Hono<{ Variables: { walletAddress: string } }>();

completions.post("/v1/completions", walletAuth, balanceCheck, async (c) => {
  const walletAddress = c.get("walletAddress") as string;
  const body = (await c.req.json()) as any;

  const model = typeof body.model === "string" ? body.model : "";
  const promptInput = body.prompt;
  const isStream = Boolean(body.stream);

  if (!model) {
    return c.json({ error: "Model is required" }, 400);
  }

  if (!(model.startsWith("gpt-") || model.startsWith("o1-"))) {
    return c.json({ error: "Completions supported only for OpenAI-compatible models" }, 400);
  }

  const prompt =
    typeof promptInput === "string"
      ? promptInput
      : Array.isArray(promptInput)
        ? promptInput.join("\n")
        : "";

  if (!prompt) {
    return c.json({ error: "Prompt is required" }, 400);
  }

  const completionBody = {
    ...body,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const result = await handleOpenAI(walletAddress, completionBody, {
    stream: isStream,
    responseFormat: "completion",
  });

  if (result.type === "stream" && result.stream) {
    const completionId = `cmpl-${Date.now()}`;
    const started = Math.floor(Date.now() / 1000);
    return stream(c, async (streamWriter) => {
      for await (const chunk of result.stream) {
        const sseData = {
          id: completionId,
          object: "text_completion.chunk",
          created: started,
          model,
          choices: [
            {
              index: 0,
              text: chunk,
              logprobs: null,
              finish_reason: null,
            },
          ],
        };
        await streamWriter.write(`data: ${JSON.stringify(sseData)}\n\n`);
      }
      let finishReason: string | null = null;
      if (typeof result.finalize === "function") {
        const metadata = await result.finalize();
        if (metadata) {
          finishReason = metadata.finishReason ?? "stop";
          const finalChunk = {
            id: completionId,
            object: "text_completion.chunk",
            created: started,
            model,
            choices: [
              {
                index: 0,
                text: "",
                logprobs: null,
                finish_reason: finishReason,
              },
            ],
            usage: {
              prompt_tokens: metadata.usage.inputTokens,
              completion_tokens: metadata.usage.outputTokens,
              total_tokens: metadata.usage.totalTokens,
            },
            solforge_metadata: {
              balance_remaining: metadata.newBalance.toFixed(8),
              cost_usd: metadata.cost.toFixed(8),
            },
          };
          await streamWriter.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        }
      }
      if (!finishReason) {
        const finalChunk = {
          id: completionId,
          object: "text_completion.chunk",
          created: started,
          model,
          choices: [
            {
              index: 0,
              text: "",
              logprobs: null,
              finish_reason: "stop",
            },
          ],
        };
        await streamWriter.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      }
      await streamWriter.write("data: [DONE]\n\n");
    });
  }

  const unsafeResult = result as {
    response: any;
    newBalance: number;
    cost: number;
  };

  return c.json(unsafeResult.response, 200, {
    "x-balance-remaining": unsafeResult.newBalance.toFixed(8),
    "x-cost-usd": unsafeResult.cost.toFixed(8),
  });
});

export default completions;
