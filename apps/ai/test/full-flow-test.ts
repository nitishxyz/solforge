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

  get secretKey(): Uint8Array {
    return this.keypair.secretKey;
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
const BASE_URL = "http://localhost:4000";

async function createAuthHeaders() {
  const nonce = Date.now().toString();
  const message = new TextEncoder().encode(nonce);
  const signature = await signMessageWithKeypair(keypair, message);

  return {
    "x-wallet-address": wallet.publicKey.toBase58(),
    "x-wallet-signature": bs58.encode(signature),
    "x-wallet-nonce": nonce,
  };
}

async function testFullFlow() {
  console.log("\n🧪 Full x402 Payment Flow Test");
  console.log("================================\n");

  console.log("🔑 Test Wallet:", wallet.publicKey.toBase58());
  console.log("");

  try {
    // Step 1: Check initial balance (should be 0)
    console.log("📊 Step 1: Check initial balance");
    const balanceHeaders = await createAuthHeaders();
    const balanceRes = await fetch(`${BASE_URL}/v1/balance`, {
      headers: balanceHeaders,
    });

    if (balanceRes.ok) {
      const balance = (await balanceRes.json()) as any;
      console.log("   ✅ Balance:", balance.balance_usd);
      console.log("   Total spent:", balance.total_spent);
      console.log("   Request count:", balance.request_count);
    } else {
      console.log("   ⚠️  User not found (will be created on first request)");
    }
    console.log("");

    // Step 2: Try to make a chat request (should get 402)
    console.log("💬 Step 2: Make chat request with insufficient balance");
    const chatRes = await client.makeAuthenticatedRequest(
      `${BASE_URL}/v1/chat/completions`,
      wallet,
      (msg) => signMessageWithKeypair(keypair, msg),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Say hello!" }],
        }),
      }
    );

   if (chatRes.status === 402) {
     console.log("   ✅ Got 402 Payment Required (expected)");
     const body = (await chatRes.clone().json()) as any;
     console.log("   x402Version:", body.x402Version);
      console.log("   Payment accepts:", body.accepts?.length || 0);
      
      if (body.accepts?.[0]) {
        const req = body.accepts[0];
        console.log("   Amount required:", parseInt(req.maxAmountRequired) / 1_000_000, "USDC");
        console.log("   Pay to:", req.payTo);
      }
      console.log("");

      // Step 3: Check if we have USDC to make payment
      console.log("💳 Step 3: Attempt x402 payment");
      console.log("   ⚠️  NOTE: This requires devnet USDC in your wallet");
      console.log("   Run: ./scripts/setup-devnet-wallet.sh");
      console.log("   Get USDC: https://faucet.circle.com/");
      console.log("");

      try {
        const paidRes = await client.handlePaymentRequired(
          chatRes,
          wallet,
          (msg) => signMessageWithKeypair(keypair, msg),
          `${BASE_URL}/v1/chat/completions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: "Say hello!" }],
            }),
          }
        );

        if (paidRes.ok) {
          const result = (await paidRes.json()) as any;
          console.log("   ✅ Payment successful! Request completed.");
          console.log("   Response:", result.choices[0]?.message?.content);
          console.log("");

          // Step 4: Check final balance
          console.log("📊 Step 4: Check final balance");
          const finalBalanceHeaders = await createAuthHeaders();
          const finalBalanceRes = await fetch(`${BASE_URL}/v1/balance`, {
            headers: finalBalanceHeaders,
          });
          const finalBalance = (await finalBalanceRes.json()) as any;
          console.log("   Balance:", finalBalance.balance_usd);
          console.log("   Total spent:", finalBalance.total_spent);
          console.log("   Total topups:", finalBalance.total_topups);
          console.log("   Request count:", finalBalance.request_count);
          console.log("");

          // Step 5: Check transaction history
          console.log("📜 Step 5: Check transaction history");
          const txHeaders = await createAuthHeaders();
          const txRes = await fetch(`${BASE_URL}/v1/transactions?limit=5`, {
            headers: txHeaders,
          });
          const txData = (await txRes.json()) as any;
          console.log(`   Found ${txData.transactions.length} transactions:`);
          
          txData.transactions.forEach((tx: any, i: number) => {
            console.log(`   ${i + 1}. ${tx.type.toUpperCase()}: $${tx.amount_usd} (${tx.model || 'N/A'})`);
          });
          console.log("");

          console.log("✅ All tests passed!");
        } else {
          const error = await paidRes.text();
          console.log("   ❌ Request failed after payment:", error);
        }
      } catch (paymentError: any) {
        console.log("   ❌ Payment failed:", paymentError.message);
        console.log("");
        console.log("   This is expected if you don't have devnet USDC.");
        console.log("   To complete the full test:");
        console.log("   1. Run: ./scripts/setup-devnet-wallet.sh");
        console.log("   2. Get devnet USDC from https://faucet.circle.com/");
        console.log("   3. Run this test again");
      }
    } else if (chatRes.ok) {
      const data = (await chatRes.json()) as any;
      console.log("   ✅ Request succeeded without payment (sufficient balance)");
      console.log("   Response:", data.choices[0]?.message?.content);
    } else {
      console.log("   ❌ Unexpected response:", chatRes.status);
      console.log("   Body:", await chatRes.text());
    }
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

if (import.meta.main) {
  await testFullFlow();
}
