import { test, expect } from "bun:test";
import {
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
// eslint-disable-next-line import/default
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import IDL from "./soljar.json" with { type: "json" };
import type { Soljar } from "./soljar";

function rpcUrl() {
	return process.env.SOLFORGE_RPC_URL ?? "http://127.0.0.1:8899";
}

// USDC mint cloned into SolForge (used by setupAccountV2)
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function derivePdas(owner: PublicKey, programId: PublicKey) {
	const accountV2 = PublicKey.findProgramAddressSync(
		[Buffer.from("account_v2"), owner.toBuffer()],
		programId,
	)[0];

	const vaultV2 = PublicKey.findProgramAddressSync(
		[Buffer.from("vault_v2"), accountV2.toBuffer()],
		programId,
	)[0];

	return { accountV2, vaultV2 };
}

test("executeTransaction transfers SOL from vault to recipient", async () => {
	const connection = new Connection(rpcUrl(), "confirmed");

	// Fresh payer and SOL
	const payer = Keypair.generate();
	const airdropSig = await connection.requestAirdrop(
		payer.publicKey,
		2 * LAMPORTS_PER_SOL,
	);
	await connection.confirmTransaction(airdropSig, "confirmed");

	// Anchor provider + program from local IDL/types
	const provider = new AnchorProvider(connection, new NodeWallet(payer), {
		commitment: "confirmed",
		preflightCommitment: "confirmed",
	});
	const program = new Program<Soljar>(IDL as unknown as Soljar, provider);

	// Unique routeId to avoid collisions across runs
	const routeId = `exec_tx_${Date.now().toString(36).slice(-6)}`;

	// Setup account so PDAs exist
	await program.methods
		.setupAccountV2(routeId, null)
		.accounts({
			owner: payer.publicKey,
			paymaster: payer.publicKey,
			usdcMint: USDC_MINT,
		})
		.signers([payer])
		.rpc();

	const { accountV2, vaultV2 } = derivePdas(payer.publicKey, program.programId);

	// Fund the vault with SOL to transfer
	const vaultAirdrop = await connection.requestAirdrop(
		vaultV2,
		1 * LAMPORTS_PER_SOL,
	);
	await connection.confirmTransaction(vaultAirdrop, "confirmed");

	// Prepare recipient
	const recipient = Keypair.generate().publicKey;

	const beforeVault = await connection.getBalance(vaultV2, {
		commitment: "confirmed",
	});
	const beforeRecipient = await connection.getBalance(recipient, {
		commitment: "confirmed",
	});

	// Build a simple SystemProgram.transfer instruction executed via the vault PDA
	const amount = 100_000; // 0.0001 SOL
	const transferIx = SystemProgram.transfer({
		fromPubkey: vaultV2,
		toPubkey: recipient,
		lamports: amount,
	});

	// Remaining accounts referenced by indices in instruction
	const remainingAccounts = [
		{ pubkey: vaultV2, isWritable: true, isSigner: false },
		{ pubkey: recipient, isWritable: true, isSigner: false },
	];

	const instructions = [
		{
			programId: SystemProgram.programId,
			data: Buffer.from(transferIx.data),
			accountIndices: Buffer.from([0, 1]),
			accountWriteFlags: [true, true],
		},
	];

	// Execute via program (vault signs via PDA seeds)
	await program.methods
		.executeTransaction(instructions as never)
		.accounts({
			account: accountV2,
			vault: vaultV2,
			owner: payer.publicKey,
		})
		.remainingAccounts(remainingAccounts)
		.signers([payer])
		.rpc();

	const afterVault = await connection.getBalance(vaultV2, {
		commitment: "confirmed",
	});
	const afterRecipient = await connection.getBalance(recipient, {
		commitment: "confirmed",
	});

	expect(afterRecipient - beforeRecipient).toBe(amount);
	expect(beforeVault - afterVault).toBeGreaterThanOrEqual(amount);
});
