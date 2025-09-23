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
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	createTransferCheckedInstruction,
	getAssociatedTokenAddressSync,
	getAccount as getSplAccount,
	MintLayout,
	MINT_SIZE,
} from "@solana/spl-token";

import IDL from "./soljar.json" with { type: "json" };
import type { Soljar } from "./soljar";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function rpcUrl() {
	return process.env.SOLFORGE_RPC_URL ?? "http://127.0.0.1:8899";
}

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

test("executeTransaction sends USDC from vault to recipient", async () => {
	const connection = new Connection(rpcUrl(), "confirmed");

	const payer = Keypair.generate();
	const airdropSig = await connection.requestAirdrop(
		payer.publicKey,
		2 * LAMPORTS_PER_SOL,
	);
	await connection.confirmTransaction(airdropSig, "confirmed");

	const provider = new AnchorProvider(connection, new NodeWallet(payer), {
		commitment: "confirmed",
		preflightCommitment: "confirmed",
	});
	const program = new Program<Soljar>(IDL as unknown as Soljar, provider);

	const routeId = `usdc_tx_${Date.now().toString(36).slice(-6)}`;
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

	const mintAmount = 1_000_000n; // 1 USDC if decimals=6
	const rpcRes = await fetch(rpcUrl(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: "mint_to_vault",
			method: "solforgeMintTo",
			params: [USDC_MINT.toBase58(), vaultV2.toBase58(), mintAmount.toString()],
		}),
	});
	const rpcJson = (await rpcRes.json()) as {
		result?: unknown;
		error?: unknown;
	};
	expect(rpcJson.error, "mintTo should succeed").toBeUndefined();

	const fromTokenAccount = getAssociatedTokenAddressSync(
		USDC_MINT,
		vaultV2,
		true,
	);
	const recipient = Keypair.generate().publicKey;
	const toTokenAccount = getAssociatedTokenAddressSync(
		USDC_MINT,
		recipient,
		true,
	);

	const mintInfo = await connection.getAccountInfo(USDC_MINT, "confirmed");
	if (!mintInfo) throw new Error("USDC mint not found on SolForge");
	const decodedMint = MintLayout.decode(mintInfo.data.slice(0, MINT_SIZE));
	const decimals = decodedMint.decimals;

	const beforeFrom = (
		await getSplAccount(connection, fromTokenAccount, "confirmed")
	).amount;
	const recipientAtaInfo = await connection.getAccountInfo(
		toTokenAccount,
		"confirmed",
	);
	const beforeTo = recipientAtaInfo
		? (await getSplAccount(connection, toTokenAccount, "confirmed")).amount
		: 0n;

	const remainingAccounts: Array<{
		publicKey: PublicKey;
		isWritable: boolean;
		isSigner: boolean;
	}> = [];
	const findOrAddAccount = (pk: PublicKey, w: boolean, s: boolean) => {
		const i = remainingAccounts.findIndex((a) => a.publicKey.equals(pk));
		if (i !== -1) {
			const entry = remainingAccounts[i];
			if (w) entry.isWritable = true;
			if (s) entry.isSigner = true;
			return i;
		}
		remainingAccounts.push({ publicKey: pk, isWritable: w, isSigner: s });
		return remainingAccounts.length - 1;
	};

	const payerIdx = findOrAddAccount(payer.publicKey, true, true);
	const vaultIdx = findOrAddAccount(vaultV2, false, false);
	const mintIdx = findOrAddAccount(USDC_MINT, false, false);
	const systemIdx = findOrAddAccount(SystemProgram.programId, false, false);
	const tokenIdx = findOrAddAccount(TOKEN_PROGRAM_ID, false, false);
	const ataProgIdx = findOrAddAccount(
		ASSOCIATED_TOKEN_PROGRAM_ID,
		false,
		false,
	);
	const fromAtaIdx = findOrAddAccount(fromTokenAccount, true, false);
	const toAtaIdx = findOrAddAccount(toTokenAccount, true, false);
	const ownerIdx = findOrAddAccount(recipient, false, false);

	const instructions: Array<{
		programId: PublicKey;
		data: Buffer;
		accountIndices: Buffer;
		accountWriteFlags: boolean[];
	}> = [];

	if (!recipientAtaInfo) {
		const createIx = createAssociatedTokenAccountInstruction(
			payer.publicKey,
			toTokenAccount,
			recipient,
			USDC_MINT,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		);
		instructions.push({
			programId: ASSOCIATED_TOKEN_PROGRAM_ID,
			data: Buffer.from(createIx.data),
			accountIndices: Buffer.from([
				payerIdx,
				toAtaIdx,
				ownerIdx,
				mintIdx,
				systemIdx,
				tokenIdx,
				ataProgIdx,
			]),
			accountWriteFlags: [true, true, false, false, false, false, false],
		});
	}

	const sendAmount = 105_000n; // 0.105 USDC at 6 decimals
	const transferIx = createTransferCheckedInstruction(
		fromTokenAccount,
		USDC_MINT,
		toTokenAccount,
		vaultV2,
		Number(sendAmount),
		decimals,
	);
	instructions.push({
		programId: TOKEN_PROGRAM_ID,
		data: Buffer.from(transferIx.data),
		accountIndices: Buffer.from([fromAtaIdx, mintIdx, toAtaIdx, vaultIdx]),
		accountWriteFlags: [true, false, true, false],
	});

	await program.methods
		.executeTransaction(instructions as never)
		.accounts({ account: accountV2, vault: vaultV2, owner: payer.publicKey })
		.remainingAccounts(
			remainingAccounts.map((a) => ({
				pubkey: a.publicKey,
				isWritable: a.isWritable,
				isSigner: a.isSigner,
			})),
		)
		.signers([payer])
		.rpc();

	// Post balances
	const afterFrom = (
		await getSplAccount(connection, fromTokenAccount, "confirmed")
	).amount;
	const afterTo = (await getSplAccount(connection, toTokenAccount, "confirmed"))
		.amount;

	expect(afterTo - beforeTo).toBe(sendAmount);
	expect(beforeFrom - afterFrom).toBe(sendAmount);
});
