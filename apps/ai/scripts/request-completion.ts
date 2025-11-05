import bs58 from "bs58";
import {
  BASE_URL,
  fetchWithAutoTopup,
  walletPublicKey,
} from "./lib/solforge-client";

async function createRequestInit(
  prompt: string,
  stream: boolean,
): Promise<RequestInit> {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      prompt,
      max_tokens: 256,
      stream,
    }),
  };
}

async function handleStreamingResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    console.error("Streaming response missing body reader");
    process.exit(1);
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let metadataSummary: {
    balanceRemaining: string;
    costUsd: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    finishReason: string;
  } | null = null;
  process.stdout.write("Streamed completion: ");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawChunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (!rawChunk.startsWith("data:")) {
        continue;
      }

      const payload = rawChunk.slice(5).trim();
      if (payload === "[DONE]") {
        process.stdout.write("\n");
        if (metadataSummary) {
          console.log(
            `Metadata -> balance: ${metadataSummary.balanceRemaining}, cost: ${metadataSummary.costUsd}, finish_reason: ${metadataSummary.finishReason}`,
          );
          if (metadataSummary.usage) {
            console.log(
              `Usage -> prompt: ${metadataSummary.usage.prompt_tokens}, completion: ${metadataSummary.usage.completion_tokens}, total: ${metadataSummary.usage.total_tokens}`,
            );
          }
        }
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        if (parsed.solforge_metadata) {
          metadataSummary = {
            balanceRemaining: parsed.solforge_metadata.balance_remaining,
            costUsd: parsed.solforge_metadata.cost_usd,
            usage: parsed.usage,
            finishReason:
              parsed.choices?.[0]?.finish_reason ?? metadataSummary?.finishReason ?? "stop",
          };
          continue;
        }
        const text = parsed.choices?.[0]?.text;
        if (typeof text === "string" && text.length > 0) {
          process.stdout.write(text);
        }
      } catch (error) {
        console.error("\nFailed to parse stream chunk:", error);
        process.exit(1);
      }
    }
  }
  if (buffer.trim().length > 0) {
    const segments = buffer.split("\n\n");
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.solforge_metadata) {
          metadataSummary = {
            balanceRemaining: parsed.solforge_metadata.balance_remaining,
            costUsd: parsed.solforge_metadata.cost_usd,
            usage: parsed.usage,
            finishReason:
              parsed.choices?.[0]?.finish_reason ?? metadataSummary?.finishReason ?? "stop",
          };
          continue;
        }
        const text = parsed.choices?.[0]?.text;
        if (typeof text === "string" && text.length > 0) {
          process.stdout.write(text);
        }
      } catch (error) {
        console.error("\nFailed to parse stream chunk:", error);
        process.exit(1);
      }
    }
  }
  process.stdout.write("\n");
  if (metadataSummary) {
    console.log(
      `Metadata -> balance: ${metadataSummary.balanceRemaining}, cost: ${metadataSummary.costUsd}, finish_reason: ${metadataSummary.finishReason}`,
    );
    if (metadataSummary.usage) {
      console.log(
        `Usage -> prompt: ${metadataSummary.usage.prompt_tokens}, completion: ${metadataSummary.usage.completion_tokens}, total: ${metadataSummary.usage.total_tokens}`,
      );
    }
  }
}

async function handleJsonResponse(response: Response) {
  const balanceRemaining = response.headers.get("x-balance-remaining");
  const costUsd = response.headers.get("x-cost-usd");

  const json = await response.json();
  const choice = json.choices?.[0];
  const text = typeof choice?.text === "string" ? choice.text.trim() : "";
  console.log("Completion:", text.length ? text : "(empty)");
  if (json.usage) {
    console.log(
      `Usage -> prompt: ${json.usage.prompt_tokens}, completion: ${json.usage.completion_tokens}, total: ${json.usage.total_tokens}`,
    );
  }
  if (balanceRemaining || costUsd) {
    console.log(
      `Metadata -> balance: ${balanceRemaining ?? "n/a"}, cost: ${costUsd ?? "n/a"}`,
    );
  }
}

async function requestCompletion(prompt: string, stream = false) {
  const requestInit = await createRequestInit(prompt, stream);
  const { response } = await fetchWithAutoTopup(
    {
      url: `${BASE_URL}/v1/completions`,
      init: requestInit,
    },
    3,
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Request failed (${response.status}):`, errText);
    process.exit(1);
  }

  if (stream) {
    await handleStreamingResponse(response);
  } else {
    await handleJsonResponse(response);
  }
}

const [, , ...args] = Bun.argv;
if (!args[0]) {
  console.error("Usage: bun run scripts/request-completion.ts <prompt> [--stream]");
  process.exit(1);
}

const [prompt, ...rest] = args;
const stream = rest.includes("--stream");

console.log(`🔑 Wallet: ${walletPublicKey}`);
await requestCompletion(prompt, stream);
