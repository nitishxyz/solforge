import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";

const RPC_URL = "http://localhost:8899";

async function main() {
	console.log("🧪 Testing error detection fix...\n");

	const connection = new Connection(RPC_URL, "confirmed");
	
	const payer = Keypair.generate();
	const recipient = Keypair.generate();

	console.log("1️⃣  Requesting airdrop...");
	const airdropSig = await connection.requestAirdrop(payer.publicKey, 0.1 * LAMPORTS_PER_SOL);
	await connection.confirmTransaction(airdropSig);
	console.log("   ✅ Airdrop confirmed\n");

	console.log("2️⃣  Creating failing transaction...");
	const { blockhash } = await connection.getLatestBlockhash();
	
	const tx = new Transaction();
	tx.recentBlockhash = blockhash;
	tx.feePayer = payer.publicKey;
	
	tx.add(
		SystemProgram.transfer({
			fromPubkey: payer.publicKey,
			toPubkey: recipient.publicKey,
			lamports: 10 * LAMPORTS_PER_SOL,
		})
	);

	tx.sign(payer);

	console.log("3️⃣  Sending transaction (should fail)...");
	try {
		const sig = await connection.sendRawTransaction(tx.serialize());
		console.log("   Transaction signature:", sig);
		
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		console.log("\n4️⃣  Getting transaction details...");
		const txDetails = await connection.getTransaction(sig, {
			maxSupportedTransactionVersion: 0,
		});

		if (txDetails) {
			const hasError = txDetails.meta?.err !== null;
			console.log("   Transaction status:", hasError ? "❌ FAILED" : "✅ SUCCESS");
			console.log("   Meta err:", JSON.stringify(txDetails.meta?.err));
			
			if (txDetails.meta?.logMessages) {
				console.log("\n   📋 Logs:");
				for (const log of txDetails.meta.logMessages) {
					const color = log.includes("failed") ? "\x1b[31m" : log.includes("success") ? "\x1b[32m" : "\x1b[37m";
					console.log(`   ${color}${log}\x1b[0m`);
				}
			}
			
			console.log("\n" + (hasError ? "✅ SUCCESS: Error properly detected!" : "❌ FAIL: Error not detected"));
		} else {
			console.log("   ❌ Transaction not found");
		}
	} catch (error: any) {
		console.log("   Transaction rejected:", error.message);
	}
}

main().catch(console.error);
