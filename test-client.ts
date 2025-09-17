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

async function testLiteSVMRpc() {
	console.log("🧪 Testing LiteSVM RPC Server...\n");

	const rpc = createSolanaRpc("http://localhost:8899");

	try {
		console.log("1️⃣  Testing getHealth...");
		const health = await rpc.getHealth().send();
		console.log("   Health:", health, "\n");

		console.log("2️⃣  Testing getVersion...");
		const version = await rpc.getVersion().send();
		console.log("   Version:", version, "\n");

		console.log("3️⃣  Creating test wallets...");
		const payer = await generateKeyPairSigner();
		const recipient = await generateKeyPairSigner();
		console.log("   Payer:", payer.address);
		console.log("   Recipient:", recipient.address, "\n");

		console.log("4️⃣  Requesting airdrop to payer...");
		const airdropAmount = lamports(2_000_000_000n);
		const airdropSig = await rpc
			.requestAirdrop(payer.address, airdropAmount, { commitment: "confirmed" })
			.send();
		console.log("   Airdrop signature:", airdropSig, "\n");

		console.log("5️⃣  Checking payer balance...");
		const { value: payerBalance } = await rpc
			.getBalance(payer.address, { commitment: "confirmed" })
			.send();
		console.log(
			"   Payer balance:",
			Number(payerBalance) / 1_000_000_000,
			"SOL\n",
		);

		console.log("6️⃣  Getting latest blockhash...");
		const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
		console.log("   Blockhash:", latestBlockhash.blockhash, "\n");

		console.log("7️⃣  Creating transfer transaction...");
		const transferAmount = lamports(500_000_000n);
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

		console.log("8️⃣  Signing transaction...");
		const signedTransaction =
			await signTransactionMessageWithSigners(transactionMessage);
		const signature = getSignatureFromTransaction(signedTransaction);
		console.log("   Transaction signature:", signature, "\n");

		console.log("9️⃣  Simulating transaction...");
		const base64Tx = getBase64EncodedWireTransaction(signedTransaction);
		const { value: simulation } = await rpc
			.simulateTransaction(base64Tx, { encoding: "base64" })
			.send();
		console.log("   Simulation result:", simulation.err ? "Failed" : "Success");
		if (simulation.logs) {
			console.log(
				"   Logs:",
				simulation.logs.slice(0, 3).join("\n         "),
				"\n",
			);
		}

		console.log("🔟 Sending transaction...");
		const txSig = await rpc
			.sendTransaction(base64Tx, { encoding: "base64" })
			.send();
		console.log("   Transaction sent:", txSig, "\n");

		console.log("1️⃣1️⃣ Checking recipient balance...");
		const { value: recipientBalance } = await rpc
			.getBalance(recipient.address, { commitment: "confirmed" })
			.send();
		console.log(
			"   Recipient balance:",
			Number(recipientBalance) / 1_000_000_000,
			"SOL\n",
		);

		console.log("1️⃣2️⃣ Getting transaction status...");
		const { value: statuses } = await rpc.getSignatureStatuses([txSig]).send();
		console.log("   Transaction status:", statuses[0], "\n");

		console.log("✅ All tests passed!");
	} catch (error) {
		console.error("❌ Test failed:", error);
	}
}

if (import.meta.main) {
	testLiteSVMRpc();
}
