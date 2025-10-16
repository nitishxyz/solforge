import {
	appendTransactionMessageInstructions,
	createSolanaRpc,
	createTransactionMessage,
	generateKeyPairSigner,
	getBase64EncodedWireTransaction,
	getSignatureFromTransaction,
	lamports,
	pipe,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

async function testComplexFailingTransaction() {
	console.log("🧪 Testing complex multi-instruction transaction with failure...\n");

	const rpc = createSolanaRpc("http://localhost:8899");

	try {
		console.log("1️⃣  Creating test wallets...");
		const payer = await generateKeyPairSigner();
		const recipient1 = await generateKeyPairSigner();
		const recipient2 = await generateKeyPairSigner();
		const recipient3 = await generateKeyPairSigner();
		console.log("   Payer:", payer.address);
		console.log("   Recipient 1:", recipient1.address);
		console.log("   Recipient 2:", recipient2.address);
		console.log("   Recipient 3:", recipient3.address, "\n");

		console.log("2️⃣  Requesting airdrop (1 SOL)...");
		const airdropAmount = lamports(1_000_000_000n);
		await rpc
			.requestAirdrop(payer.address, airdropAmount, { commitment: "confirmed" })
			.send();

		const { value: payerBalance } = await rpc
			.getBalance(payer.address, { commitment: "confirmed" })
			.send();
		console.log(
			"   Payer balance:",
			Number(payerBalance) / 1_000_000_000,
			"SOL\n",
		);

		console.log("3️⃣  Getting latest blockhash...");
		const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
		console.log("   Blockhash:", latestBlockhash.blockhash, "\n");

		console.log("4️⃣  Creating multi-instruction transaction:");
		console.log("   - Transfer 0.1 SOL to recipient1 ✅ (should succeed)");
		console.log("   - Transfer 0.2 SOL to recipient2 ✅ (should succeed)");
		console.log("   - Transfer 10 SOL to recipient3 ❌ (should FAIL - insufficient funds)");
		console.log("   - Transfer 0.05 SOL to recipient1 ❓ (unreachable due to previous failure)\n");

		const transfer1 = getTransferSolInstruction({
			source: payer,
			destination: recipient1.address,
			amount: lamports(100_000_000n),
		});

		const transfer2 = getTransferSolInstruction({
			source: payer,
			destination: recipient2.address,
			amount: lamports(200_000_000n),
		});

		const transfer3 = getTransferSolInstruction({
			source: payer,
			destination: recipient3.address,
			amount: lamports(10_000_000_000n),
		});

		const transfer4 = getTransferSolInstruction({
			source: payer,
			destination: recipient1.address,
			amount: lamports(50_000_000n),
		});

		const transactionMessage = pipe(
			createTransactionMessage({ version: 0 }),
			(tx) => setTransactionMessageFeePayerSigner(payer, tx),
			(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
			(tx) => appendTransactionMessageInstructions([transfer1, transfer2, transfer3, transfer4], tx),
		);

		console.log("5️⃣  Signing transaction...");
		const signedTransaction =
			await signTransactionMessageWithSigners(transactionMessage);
		const signature = getSignatureFromTransaction(signedTransaction);
		console.log("   Transaction signature:", signature, "\n");

		console.log("6️⃣  Simulating transaction...");
		const base64Tx = getBase64EncodedWireTransaction(signedTransaction);
		const { value: simulation } = await rpc
			.simulateTransaction(base64Tx, { encoding: "base64" })
			.send();

		console.log("   Simulation result:", simulation.err ? "❌ Failed" : "✅ Success");
		if (simulation.err) {
			console.log("   Error:", JSON.stringify(simulation.err));
		}
		if (simulation.logs) {
			console.log("\n   📋 Simulation Logs:");
			for (const log of simulation.logs) {
				console.log("     ", log);
			}
			console.log();
		}

		console.log("7️⃣  Sending transaction to chain...");
		try {
			const txSig = await rpc
				.sendTransaction(base64Tx, { 
					encoding: "base64",
					skipPreflight: true
				})
				.send();
			console.log("   Transaction submitted:", txSig);
			console.log("   Note: Transaction was accepted but instruction #3 should fail\n");

			await new Promise(resolve => setTimeout(resolve, 2000));

			console.log("8️⃣  Checking final balances...");
			const { value: recipient1Balance } = await rpc
				.getBalance(recipient1.address, { commitment: "confirmed" })
				.send();
			const { value: recipient2Balance } = await rpc
				.getBalance(recipient2.address, { commitment: "confirmed" })
				.send();
			const { value: recipient3Balance } = await rpc
				.getBalance(recipient3.address, { commitment: "confirmed" })
				.send();

			console.log("   Recipient 1:", Number(recipient1Balance) / 1_000_000_000, "SOL");
			console.log("   Recipient 2:", Number(recipient2Balance) / 1_000_000_000, "SOL");
			console.log("   Recipient 3:", Number(recipient3Balance) / 1_000_000_000, "SOL");
			console.log();

			console.log("9️⃣  Getting transaction details...");
			const txDetails = await rpc
				.getTransaction(txSig, {
					encoding: "jsonParsed",
					maxSupportedTransactionVersion: 0,
				})
				.send();

			if (txDetails) {
				const hasError = txDetails.meta?.err !== null;
				console.log("   Transaction status:", hasError ? "❌ FAILED" : "✅ SUCCESS");
				console.log("   Meta err:", JSON.stringify(txDetails.meta?.err));
				
				if (txDetails.meta?.logMessages) {
					console.log("\n   📋 On-chain Logs:");
					for (const log of txDetails.meta.logMessages) {
						console.log("     ", log);
					}
				}
			}

		} catch (error: any) {
			console.log("   ❌ Transaction rejected by network");
			console.log("   Error:", error.message || error);
		}

		console.log("\n✅ Test complete!");
		console.log("\n💡 Key Points:");
		console.log("   - The transaction contains 4 transfer instructions");
		console.log("   - Instructions 1 & 2 could succeed if executed independently");
		console.log("   - Instruction 3 fails due to insufficient funds");
		console.log("   - When one instruction fails, the ENTIRE transaction fails atomically");
		console.log("   - All state changes are rolled back (no SOL is transferred)");
		console.log("   - Transaction fee is still charged even on failure");
		console.log("   - UI should show ❌ FAILED status (meta.err !== null)");

	} catch (error) {
		console.error("❌ Test error:", error);
	}
}

if (import.meta.main) {
	testComplexFailingTransaction();
}
