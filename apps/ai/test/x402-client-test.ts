import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  X402Client,
  signMessageWithKeypair,
  type WalletAdapter,
} from "../src/client/x402-client";

const TEST_WALLET_PRIVATE_KEY =
  "4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";

const keypair = Keypair.fromSecretKey(bs58.decode(TEST_WALLET_PRIVATE_KEY));

class SimpleWalletAdapter implements WalletAdapter {
  constructor(private keypair: Keypair) {}

 get publicKey(): PublicKey {
   return this.keypair.publicKey;
 }

 async signTransaction(tx: any): Promise<any> {
   if ('version' in tx) {
     tx.sign([this.keypair]);
     return tx;
   }
   tx.partialSign(this.keypair);
   return tx;
 }
}

const wallet = new SimpleWalletAdapter(keypair);
const client = new X402Client("https://api.devnet.solana.com");

async function testWithAutoPayment() {
  console.log("\n🧪 Testing x402 Client with Auto-Payment\n");

  console.log("🔑 Wallet:", wallet.publicKey.toBase58());

  try {
    console.log("\n📡 Making request that will trigger 402...");

    const response = await client.makeAuthenticatedRequest(
      "http://localhost:4000/v1/chat/completions",
      wallet,
      (msg) => signMessageWithKeypair(keypair, msg),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello!" }],
        }),
      }
    );

    if (response.status === 402) {
      console.log("\n💳 Got 402 Payment Required - handling automatically...");

      const finalResponse = await client.handlePaymentRequired(
        response,
        wallet,
        (msg) => signMessageWithKeypair(keypair, msg),
        "http://localhost:4000/v1/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello!" }],
          }),
        }
      );

      if (finalResponse.ok) {
        const data = (await finalResponse.json()) as any;
        console.log("\n✅ Final Response:");
        console.log(
          "  Message:",
          data.choices[0]?.message?.content || data.error
        );
      } else {
        console.error("❌ Request failed after payment:", response.status);
      }
    } else if (response.ok) {
      const data = (await response.json()) as any;
      console.log("\n✅ Response (no payment needed):");
      console.log("  Message:", data.choices[0]?.message?.content);
    } else {
      console.error("❌ Request failed:", response.status, await response.text());
    }
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

async function testManualPaymentCreation() {
  console.log("\n🧪 Testing Manual Payment Creation\n");

  const mockRequirement = {
    scheme: "exact" as const,
    network: "solana-devnet",
    maxAmountRequired: "1000000",
    asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    payTo: "HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw",
    resource: "http://localhost:4000/v1/chat/completions",
    description: "Test payment",
    maxTimeoutSeconds: 60,
  };

  try {
    console.log("📦 Creating payment payload...");
    const payload = await client.createPaymentPayload(wallet, mockRequirement);

    console.log("\n✅ Payment Payload Created:");
    console.log("  Version:", payload.x402Version);
    console.log("  Network:", payload.network);
    console.log("  Transaction length:", payload.payload.transaction.length);
    console.log("\nPayload structure:");
    console.log(JSON.stringify(payload, null, 2));
  } catch (error: any) {
    console.error("\n❌ Failed:", error.message);
  }
}

if (import.meta.main) {
  await testManualPaymentCreation();
  await testWithAutoPayment();
}
