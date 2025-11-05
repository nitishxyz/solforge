import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText } from "ai";
import {
  BASE_URL,
  fetchWithAutoTopup,
  walletPublicKey,
} from "../scripts/lib/solforge-client";

function createAutoTopupFetch(): typeof fetch {
  const baseFetch = globalThis.fetch.bind(globalThis);
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
    const headersObj = new Headers(init?.headers ?? {});
    const body = init?.body;
    if (body && typeof body !== "string") {
      throw new Error("Expected request body to be a string");
    }

    const { response } = await fetchWithAutoTopup({
      url,
      init: {
        method: init?.method,
        body: body as string | undefined,
        headers: Object.fromEntries(headersObj.entries()),
      },
    });

    if (response.status === 402) {
      // Should not happen because fetchWithAutoTopup retries, but safeguard
      return baseFetch(input, init);
    }

    return response;
  };
}

const solforgeProvider = createOpenAICompatible({
  baseURL: `${BASE_URL}/v1`,
  name: "solforge",
  headers: () => ({
    "Content-Type": "application/json",
  }),
  includeUsage: true,
  fetch: createAutoTopupFetch(),
});

async function run() {
  const prompt = "Summarize the SolForge AI proxy in two sentences.";

console.log(`🔑 Wallet: ${walletPublicKey}`);
console.log("➡️  Non-streaming generateText via @ai-sdk/openai-compatible");

const completion = await generateText({
  model: solforgeProvider.chatModel("gpt-4o-mini"),
  messages: [{ role: "user", content: prompt }],
});

console.log("Response:", completion.text.trim());
const completionUsageRaw =
  completion.usage ??
  completion.steps?.at(-1)?.usage ??
  (completion.steps?.at(-1)?.response as any)?.body?.usage ??
  undefined;
const completionUsage = normalizeUsage(completionUsageRaw);
if (completionUsage) {
  console.log(
    `Usage -> prompt: ${completionUsage.prompt}, completion: ${completionUsage.completion}, total: ${completionUsage.total}`,
  );
} else {
  console.log("Usage -> unavailable (provider returned no usage)");
}

console.log("\n➡️  Streaming streamText via @ai-sdk/openai-compatible");
  const streamResult = streamText({
    model: solforgeProvider.chatModel("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content:
          "Write a vivid, 600-word science fiction story about a SolForge developer discovering a hidden x402 payment anomaly on Solana, told in first person with lots of suspense.",
      },
    ],
  });

  let streamed = "";
  for await (const chunk of streamResult.textStream) {
    streamed += chunk;
    process.stdout.write(chunk);
  }
  console.log("\nStreamed response (concatenated):", streamed.trim());
const streamUsage = await streamResult.usage.catch(() => undefined);
const steps = await streamResult.steps.catch(() => undefined);
const streamingUsage = normalizeUsage(
  streamUsage ??
    steps?.at(-1)?.usage ??
    (steps?.at(-1)?.response as any)?.body?.usage ??
    undefined,
);

if (streamingUsage) {
  console.log(
    `Usage -> prompt: ${streamingUsage.prompt}, completion: ${streamingUsage.completion}, total: ${streamingUsage.total}`,
  );
} else {
console.log("Usage -> unavailable (streaming provider returned no usage)");
}
}

await run().catch((error) => {
  console.error("❌ Test run failed:", error);
  process.exit(1);
});

type RawUsage =
  | undefined
  | null
  | {
      inputTokens?: number | null;
      outputTokens?: number | null;
      totalTokens?: number | null;
      promptTokens?: number | null;
      completionTokens?: number | null;
    };

function normalizeUsage(usage: RawUsage) {
  if (!usage) {
    return undefined;
  }

  const prompt =
    usage.promptTokens ??
    usage.inputTokens ??
    (usage.totalTokens != null && usage.outputTokens != null
      ? usage.totalTokens - usage.outputTokens
      : undefined);

  const completion =
    usage.completionTokens ??
    usage.outputTokens ??
    (usage.totalTokens != null && prompt != null
      ? usage.totalTokens - prompt
      : undefined);

  const total =
    usage.totalTokens ??
    (prompt != null && completion != null ? prompt + completion : undefined);

  if (prompt == null && completion == null && total == null) {
    return undefined;
  }

  return {
    prompt: prompt ?? 0,
    completion: completion ?? 0,
    total: total ?? (prompt ?? 0) + (completion ?? 0),
  };
}
