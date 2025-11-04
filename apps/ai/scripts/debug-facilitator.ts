import { Connection, PublicKey, TransactionMessage, VersionedTransaction, Keypair } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ComputeBudgetProgram } from "@solana/web3.js";
import bs58 from "bs58";

const FACILITATOR_URL = "https://facilitator.payai.network";
const TEST_WALLET_KEY = "4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh";
const PLATFORM_WALLET = "GEiU9SUvcG4v4mwadSreQPxMGnh7aQ5VxRbKkeL3Uc4D";
const DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const FACILITATOR_FEE_PAYER = "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4";

async function main() {
  console.log("🔍 Debugging Facilitator Transaction\n");

  const keypair = Keypair.fromSecretKey(bs58.decode(TEST_WALLET_KEY));
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const mint = new PublicKey(DEVNET_USDC);
  const receiver = new PublicKey(PLATFORM_WALLET);
  const amount = 1_000_000n;

  const payerATA = await getAssociatedTokenAddress(mint, keypair.publicKey, false, TOKEN_PROGRAM_ID);
  const receiverATA = await getAssociatedTokenAddress(mint, receiver, false, TOKEN_PROGRAM_ID);
  
  console.log("Payer ATA:", payerATA.toBase58());
  console.log("Receiver ATA:", receiverATA.toBase58());

  const { blockhash } = await connection.getLatestBlockhash();
  
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 200_000,
  });

  const transferIx = createTransferInstruction(
    payerATA,
    receiverATA,
    keypair.publicKey,
    amount,
    [],
    TOKEN_PROGRAM_ID
  );

  console.log("\nTransfer instruction keys:");
  transferIx.keys.forEach((key, i) => {
    console.log(`  ${i}: ${key.pubkey.toBase58()} (${key.isSigner ? 'signer' : 'readonly'})`);
  });

  const feePayerPubkey = new PublicKey(FACILITATOR_FEE_PAYER);

  const messageV0 = new TransactionMessage({
    payerKey: feePayerPubkey,
    recentBlockhash: blockhash,
    instructions: [computeBudgetIx, transferIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);
  tx.sign([keypair]);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  
  console.log("\nTransaction details:");
  console.log("  Instructions:", tx.message.compiledInstructions.length);
  console.log("  Signatures:", tx.signatures.length);
  console.log("  Size:", serialized.length, "bytes");
  console.log("  Base64 length:", Buffer.from(serialized).toString("base64").length);

  const paymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: {
      transaction: Buffer.from(serialized).toString("base64"),
    },
  };

  const paymentRequirements = {
    scheme: "exact",
    network: "solana-devnet",
    maxAmountRequired: amount.toString(),
    asset: DEVNET_USDC,
    payTo: PLATFORM_WALLET,
    resource: "http://localhost:4000/v1/chat/completions",
    description: "Test payment",
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: {
      feePayer: FACILITATOR_FEE_PAYER,
    },
  };

  console.log("\n📤 Sending to facilitator /settle...\n");

  try {
    const response = await fetch(`${FACILITATOR_URL}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log("\nResponse body:");
    console.log(text);

    if (response.ok) {
      const result = JSON.parse(text);
      console.log("\n✅ Settlement successful!");
      console.log("Result:", JSON.stringify(result, null, 2));
    } else {
      console.log("\n❌ Settlement failed");
      try {
        const error = JSON.parse(text);
        console.log("Error:", JSON.stringify(error, null, 2));
      } catch (e) {
        console.log("Raw error:", text);
      }
    }
  } catch (error: any) {
    console.error("\n❌ Request failed:", error.message);
  }
}

main();
