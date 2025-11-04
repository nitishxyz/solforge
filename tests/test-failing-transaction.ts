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

async function testFailingTransaction() {
	console.log("🧪 Testing transaction that should fail...\n");

	const rpc = createSolanaRpc("http://localhost:8899");

	try {
		console.log("1️⃣  Creating test wallets...");
		const payer = await generateKeyPairSigner();
		const recipient = await generateKeyPairSigner();
		console.log("   Payer:", payer.address);
		console.log("   Recipient:", recipient.address, "\n");

		console.log("2️⃣  Requesting small airdrop (only 0.01 SOL)...");
		const smallAirdrop = lamports(1_000_000n);
		await rpc
			.requestAirdrop(payer.address, smallAirdrop, { commitment: "confirmed" })
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

		console.log("4️⃣  Creating transfer for reasonable amount...");
		const transferAmount = lamports(500_000n);
		console.log(
			"   Trying to transfer:",
			Number(transferAmount) / 1_000_000_000,
			"SOL",
		);
		console.log(
			"   Available balance:",
			Number(payerBalance) / 1_000_000_000,
			"SOL\n",
		);

		const transferInstruction = getTransferSolInstruction({
			source: payer,
			destination: recipient.address,
			amount: transferAmount,
		});

		const transactionMessage = pipe(
			createTransactionMessage({ version: 0 }),
			(tx) => setTransactionMessageFeePayerSigner(payer, tx),
			(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
			(tx) => appendTransactionMessageInstructions([transferInstruction], tx),
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
			console.log("   Logs:");
			for (const log of simulation.logs) {
				console.log("     ", log);
			}
			console.log();
		}

		console.log("7️⃣  Sending transaction...");
		try {
			const txSig = await rpc
				.sendTransaction(base64Tx, { encoding: "base64" })
				.send();
			console.log("   ✅ Transaction succeeded:", txSig);
		} catch (error: any) {
			console.log("   ❌ Transaction failed!");
			console.log("   Error:", error.message || error, "\n");
		}

		console.log("✅ Test complete!");
	} catch (error) {
		console.error("❌ Test error:", error);
	}
}

if (import.meta.main) {
	testFailingTransaction();
}
