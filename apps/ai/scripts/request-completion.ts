import bs58 from "bs58";
import bs58 from "bs58";
import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  X402Client,
  signMessageWithKeypair,
  type WalletAdapter,
} from "../src/client/x402-client";

const WALLET_PRIVATE_KEY =
  "4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";
const WALLET_PUBLIC_KEY = "HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw";
const BASE_URL = process.env.AI_PROXY_URL ?? "http://localhost:4000";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const TARGET_TOPUP_AMOUNT_MICRO_USDC = "100000"; // $0.10

class SimpleWalletAdapter implements WalletAdapter {
  constructor(private readonly keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  get secretKey(): Uint8Array {
    return this.keypair.secretKey;
  }

  async signTransaction(
    tx: Transaction | VersionedTransaction,
  ): Promise<Transaction | VersionedTransaction> {
    if ("version" in tx) {
      tx.sign([this.keypair]);
      return tx;
    }
    tx.partialSign(this.keypair);
    return tx;
  }
}

const keypair = Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY));
const wallet = new SimpleWalletAdapter(keypair);
const x402Client = new X402Client(RPC_URL);
const signMessage = (message: Uint8Array) =>
  signMessageWithKeypair(keypair, message);

async function createRequestInit(prompt: string, stream: boolean): Promise<RequestInit> {
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

async function createAuthHeaders() {
  return x402Client.createAuthHeaders(wallet.publicKey.toBase58(), signMessage);
}

async function settlePaymentAndRetry(
  errorResponse: Response,
  requestInit: RequestInit,
): Promise<Response> {
  const body = (await errorResponse.json()) as any;
  const accepts = Array.isArray(body.accepts) ? body.accepts : [];
  const requirement =
    accepts.find(
      (option: any) =>
        option.scheme === "exact" &&
        option.maxAmountRequired === TARGET_TOPUP_AMOUNT_MICRO_USDC,
    ) ?? accepts.find((option: any) => option.scheme === "exact");

  if (!requirement) {
    throw new Error("No supported payment requirement returned by server");
  }

  console.log(
    `🔁 Balance low, auto top-up ${(
      parseInt(requirement.maxAmountRequired, 10) / 1_000_000
    ).toFixed(2)} USDC`,
  );

  const paymentPayload = await x402Client.createPaymentPayload(
    wallet,
    requirement,
  );

  const authHeaders = await createAuthHeaders();
  const topupResponse = await fetch(`${BASE_URL}/v1/topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirement: requirement,
    }),
  });

  if (!topupResponse.ok) {
    const errorText = await topupResponse.text();
    throw new Error(`Top-up failed (${topupResponse.status}): ${errorText}`);
  }

  const topupResult = (await topupResponse.json()) as any;
  console.log(
    `✅ Top-up complete: +$${topupResult.amount_usd} (balance: $${topupResult.new_balance})`,
  );

  return x402Client.makeAuthenticatedRequest(
    `${BASE_URL}/v1/completions`,
    wallet,
    signMessage,
    requestInit,
  );
}

async function ensureResponse(
  prompt: string,
  stream: boolean,
): Promise<Response> {
  const requestInit = await createRequestInit(prompt, stream);

  let attempts = 0;
  let response: Response;
  const url = `${BASE_URL}/v1/completions`;

  while (true) {
    response = await x402Client.makeAuthenticatedRequest(
      url,
      wallet,
      signMessage,
      requestInit,
    );

    if (response.status !== 402) {
      return response;
    }

    attempts += 1;
    if (attempts > 3) {
      throw new Error("Unable to settle payment after multiple attempts");
    }

    response = await settlePaymentAndRetry(response, requestInit);
    if (response.status !== 402) {
      return response;
    }
  }
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
        if (parsed.metadata) {
          metadataSummary = {
            balanceRemaining: parsed.metadata.balance_remaining,
            costUsd: parsed.metadata.cost_usd,
            usage: parsed.metadata.usage,
            finishReason: parsed.metadata.finish_reason,
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
        if (parsed.metadata) {
          metadataSummary = {
            balanceRemaining: parsed.metadata.balance_remaining,
            costUsd: parsed.metadata.cost_usd,
            usage: parsed.metadata.usage,
            finishReason: parsed.metadata.finish_reason,
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
  const response = await ensureResponse(prompt, stream);

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

await requestCompletion(prompt, stream);
