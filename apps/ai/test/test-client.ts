// Run with: sst shell -- bun run test/test-client.ts

import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  X402Client,
  signMessageWithKeypair,
  type WalletAdapter,
} from "../src/client/x402-client";

const TEST_WALLET_PRIVATE_KEY =
  "4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";

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

const keypair = Keypair.fromSecretKey(bs58.decode(TEST_WALLET_PRIVATE_KEY));
const wallet = new SimpleWalletAdapter(keypair);
const client = new X402Client("https://api.devnet.solana.com");
const BASE_URL = "http://localhost:4000";

const signWithTestWallet = (message: Uint8Array) =>
  signMessageWithKeypair(keypair, message);

async function createAuthHeaders() {
  return client.createAuthHeaders(wallet.publicKey.toBase58(), signWithTestWallet);
}

async function listModels() {
  console.log("\n🤖 Listing models...");
  const response = await fetch(`${BASE_URL}/v1/models`);
  const data = (await response.json()) as any;
  console.log(
    data.data.map((model: any) => `${model.id}: ${JSON.stringify(model.pricing)}`),
  );
}

async function fetchBalance(label: string) {
  const headers = await createAuthHeaders();
  const response = await fetch(`${BASE_URL}/v1/balance`, { headers });
  if (!response.ok) {
    console.log(`${label}: balance unavailable (${response.status})`);
    return null;
  }
  const data = (await response.json()) as any;
  console.log(
    `${label}: $${parseFloat(data.balance_usd).toFixed(4)} | requests: ${
      data.request_count ?? 0
    }`,
  );
  return data;
}

async function fetchTransactions(limit = 5) {
  console.log("\n📜 Recent transactions...");
  const headers = await createAuthHeaders();
  const response = await fetch(`${BASE_URL}/v1/transactions?limit=${limit}`, {
    headers,
  });
  if (!response.ok) {
    console.log("Unable to load transactions:", response.status);
    return;
  }
  const data = (await response.json()) as any;
  data.transactions.forEach((tx: any, index: number) => {
    console.log(
      `  ${index + 1}. ${tx.type.toUpperCase()} - $${parseFloat(tx.amount_usd).toFixed(4)} (${tx.model ?? "n/a"})`,
    );
  });
}

async function performChatCompletion(prompt: string) {
  console.log("\n💬 Chat completion request...");
  const url = `${BASE_URL}/v1/chat/completions`;
  const chatOptions: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  };

  const initialResponse = await client.makeAuthenticatedRequest(
    url,
    wallet,
    signWithTestWallet,
    chatOptions,
  );

  const finalResponse =
    initialResponse.status === 402
      ? await client.handlePaymentRequired(
          initialResponse,
          wallet,
          signWithTestWallet,
          url,
          { ...chatOptions },
        )
      : initialResponse;

  if (!finalResponse.ok) {
    const errorBody = await finalResponse.text();
    throw new Error(
      `Chat completion failed with status ${finalResponse.status}: ${errorBody}`,
    );
  }

  const result = (await finalResponse.json()) as any;
  const message = result.choices?.[0]?.message?.content ?? "(no content)";
  console.log("✅ Model response:", message);
  console.log(
    `   Usage: prompt=${result.usage?.prompt_tokens}, completion=${result.usage?.completion_tokens}`,
  );
}

async function runTests() {
  console.log("🧪 Starting AI Proxy x402 flow");
  console.log("========================================");
  console.log(`🔑 Test Wallet: ${wallet.publicKey.toBase58()}`);

  await listModels();

  await fetchBalance("Initial balance");

  try {
    await performChatCompletion("Say hello in exactly six words.");
  } catch (error: any) {
    console.error("\n❌ Chat request failed:", error.message);
    return;
  }

  await fetchBalance("Post-request balance");
  await fetchTransactions();

  console.log("\n✅ Test run complete!");
}

if (import.meta.main) {
  await runTests();
}
