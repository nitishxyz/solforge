import { test, expect } from "bun:test";
import {
	Connection,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
	Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
// eslint-disable-next-line import/default
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_2022_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	createTransferCheckedInstruction,
	createTransferInstruction,
	getAssociatedTokenAddressSync,
	getAccount as getSplAccount,
	MintLayout,
	MINT_SIZE,
} from "@solana/spl-token";

import IDL from "./soljar.json" with { type: "json" };
import type { Soljar } from "./soljar";

// Token-2022 mint to be cloned by Solforge (provided)
const TOKEN22_MINT = new PublicKey(
	"XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
);

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

async function ensureAta(
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	owner: PublicKey,
	tokenProgramId: PublicKey,
) {
	const ata = getAssociatedTokenAddressSync(mint, owner, true, tokenProgramId);
	const info = await connection.getAccountInfo(ata, "confirmed");
	if (!info) {
		const ix = createAssociatedTokenAccountInstruction(
			payer.publicKey,
			ata,
			owner,
			mint,
			tokenProgramId,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		);
		const tx = new Transaction().add(ix);
		tx.feePayer = payer.publicKey;
		const bh = await connection.getLatestBlockhash("confirmed");
		tx.recentBlockhash = bh.blockhash;
		tx.sign(payer);
		const sig = await connection.sendRawTransaction(tx.serialize(), {
			skipPreflight: true,
		});
		const bh2 = await connection.getLatestBlockhash("confirmed");
		await connection.confirmTransaction(
			{
				signature: sig,
				blockhash: bh2.blockhash,
				lastValidBlockHeight: bh2.lastValidBlockHeight,
			},
			"confirmed",
		);
	}
	return ata;
}

test("token-2022: transferChecked from smart vault A to smart vault B", async () => {
	const connection = new Connection(rpcUrl(), "confirmed");

	const ownerA = Keypair.generate();
	const ownerB = Keypair.generate();
	const airdropA = await connection.requestAirdrop(
		ownerA.publicKey,
		2 * LAMPORTS_PER_SOL,
	);
	const airdropB = await connection.requestAirdrop(
		ownerB.publicKey,
		2 * LAMPORTS_PER_SOL,
	);
	await connection.confirmTransaction(airdropA, "confirmed");
	await connection.confirmTransaction(airdropB, "confirmed");

	const providerA = new AnchorProvider(connection, new NodeWallet(ownerA), {
		commitment: "confirmed",
		preflightCommitment: "confirmed",
	});
	const program = new Program<Soljar>(IDL as unknown as Soljar, providerA);

	// Setup accounts for both owners using token-2022 mint
	const routeA = `t22a_${Date.now().toString(36).slice(-4)}`;
	await program.methods
		.setupAccountV2(routeA, null)
		.accounts({
			owner: ownerA.publicKey,
			paymaster: ownerA.publicKey,
			usdcMint: USDC_MINT,
		})
		.signers([ownerA])
		.rpc();

	const providerB = new AnchorProvider(connection, new NodeWallet(ownerB), {
		commitment: "confirmed",
		preflightCommitment: "confirmed",
	});
	const programB = new Program<Soljar>(IDL as unknown as Soljar, providerB);
	const routeB = `t22b_${Date.now().toString(36).slice(-4)}`;
	await programB.methods
		.setupAccountV2(routeB, null)
		.accounts({
			owner: ownerB.publicKey,
			paymaster: ownerB.publicKey,
			usdcMint: USDC_MINT,
		})
		.signers([ownerB])
		.rpc();

	const { vaultV2: vaultA } = derivePdas(ownerA.publicKey, program.programId);
	const { vaultV2: vaultB } = derivePdas(ownerB.publicKey, program.programId);

	// Mint to sender vault via admin RPC (auto-detects token-2022)
	const mintAmount = 2_000_000n; // 2 tokens at 6 decimals
	const mintResp = await fetch(rpcUrl(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: "mint_t22_vault_a",
			method: "solforgeMintTo",
			params: [
				TOKEN22_MINT.toBase58(),
				vaultA.toBase58(),
				mintAmount.toString(),
			],
		}),
	});
	const mintJson = (await mintResp.json()) as { error?: unknown };
	expect(mintJson.error, "mintTo should succeed").toBeUndefined();

	console.log("Minted", mintAmount.toString(), "tokens to", vaultA.toBase58());

	// Derive ATAs (token-2022 program)
	const fromTokenAccount = getAssociatedTokenAddressSync(
		TOKEN22_MINT,
		vaultA,
		true,
		TOKEN_2022_PROGRAM_ID,
	);
	const toTokenAccount = getAssociatedTokenAddressSync(
		TOKEN22_MINT,
		vaultB,
		true,
		TOKEN_2022_PROGRAM_ID,
	);

	console.log("From", fromTokenAccount.toBase58());
	console.log("To", toTokenAccount.toBase58());

	// We will create destination ATA inside executeTransaction (first ix)

	// Read decimals
	const mintInfo = await connection.getAccountInfo(TOKEN22_MINT, "confirmed");
	if (!mintInfo) throw new Error("token-2022 mint not found");
	const decodedMint = MintLayout.decode(mintInfo.data.slice(0, MINT_SIZE));
	const decimals = decodedMint.decimals;

	const beforeFrom = (
		await getSplAccount(
			connection,
			fromTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	let beforeTo = 0n;
	try {
		beforeTo = (
			await getSplAccount(
				connection,
				toTokenAccount,
				"confirmed",
				TOKEN_2022_PROGRAM_ID,
			)
		).amount;
	} catch {}

	// Build executeTransaction with TransferChecked (token-2022)
	const remainingAccounts: Array<{
		publicKey: PublicKey;
		isWritable: boolean;
		isSigner: boolean;
	}> = [];
	const upsert = (pk: PublicKey, w: boolean, s: boolean) => {
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

	// Include ownerA so we can fund vaultA for ATA rent
	const ownerIdx = upsert(ownerA.publicKey, true, true);
	const fromIdx = upsert(fromTokenAccount, true, false);
	const mintIdx = upsert(TOKEN22_MINT, false, false);
	const toIdx = upsert(toTokenAccount, true, false);
	const authIdx = upsert(vaultA, false, false);
	// Payer must be vault (program can sign via PDA)
	const payerIdx = upsert(vaultA, true, false);
	const sysIdx = upsert(SystemProgram.programId, false, false);
	const t22Idx = upsert(TOKEN_2022_PROGRAM_ID, false, false);

	const sendAmount = 150_000n; // 0.15 tokens
	const txIx = createTransferCheckedInstruction(
		fromTokenAccount,
		TOKEN22_MINT,
		toTokenAccount,
		vaultA,
		Number(sendAmount),
		decimals,
		[],
		TOKEN_2022_PROGRAM_ID,
	);

	const instructions: Array<{
		programId: PublicKey;
		data: Buffer;
		accountIndices: Buffer;
		accountWriteFlags: boolean[];
	}> = [];
	// 0) Fund vaultA for ATA rent
	instructions.push({
		programId: SystemProgram.programId,
		data: Buffer.from(
			SystemProgram.transfer({
				fromPubkey: ownerA.publicKey,
				toPubkey: vaultA,
				lamports: 3_000_000,
			}).data,
		),
		accountIndices: Buffer.from([ownerIdx, upsert(vaultA, true, false)]),
		accountWriteFlags: [true, true],
	});
	// 1) Create destination ATA under Token-2022
	const createAtaIx = createAssociatedTokenAccountInstruction(
		vaultA,
		toTokenAccount,
		vaultB,
		TOKEN22_MINT,
		TOKEN_2022_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID,
	);
	instructions.push({
		programId: ASSOCIATED_TOKEN_PROGRAM_ID,
		data: Buffer.from(createAtaIx.data),
		accountIndices: Buffer.from([
			payerIdx,
			toIdx,
			upsert(vaultB, false, false),
			mintIdx,
			sysIdx,
			t22Idx,
		]),
		accountWriteFlags: [true, true, false, false, false, false],
	});
	// 2) TransferChecked (Token-2022)
	instructions.push({
		programId: TOKEN_2022_PROGRAM_ID,
		data: Buffer.from(txIx.data),
		accountIndices: Buffer.from([fromIdx, mintIdx, toIdx, authIdx]),
		accountWriteFlags: [true, false, true, false],
	});

	await program.methods
		.executeTransaction(instructions as never)
		.accounts({
			account: derivePdas(ownerA.publicKey, program.programId).accountV2,
			vault: vaultA,
			owner: ownerA.publicKey,
		})
		.remainingAccounts(
			remainingAccounts.map((a) => ({
				pubkey: a.publicKey,
				isWritable: a.isWritable,
				isSigner: a.isSigner,
			})),
		)
		.signers([ownerA])
		.rpc();

	const afterFrom = (
		await getSplAccount(
			connection,
			fromTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	const afterTo = (
		await getSplAccount(
			connection,
			toTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	expect(afterTo - beforeTo).toBe(sendAmount);
	expect(beforeFrom - afterFrom).toBe(sendAmount);
});

test("token-2022: raw Transfer (unchecked) from smart vault to user", async () => {
	const connection = new Connection(rpcUrl(), "confirmed");
	const owner = Keypair.generate();
	const airdrop = await connection.requestAirdrop(
		owner.publicKey,
		2 * LAMPORTS_PER_SOL,
	);
	await connection.confirmTransaction(airdrop, "confirmed");

	const provider = new AnchorProvider(connection, new NodeWallet(owner), {
		commitment: "confirmed",
		preflightCommitment: "confirmed",
	});
	const program = new Program<Soljar>(IDL as unknown as Soljar, provider);

	const route = `t22raw_${Date.now().toString(36).slice(-4)}`;
	await program.methods
		.setupAccountV2(route, null)
		.accounts({
			owner: owner.publicKey,
			paymaster: owner.publicKey,
			usdcMint: TOKEN22_MINT,
		})
		.signers([owner])
		.rpc();

	const { accountV2, vaultV2: vault } = derivePdas(
		owner.publicKey,
		program.programId,
	);

	// Mint
	const mintAmount = 1_000_000n; // 1 token
	const mintResp = await fetch(rpcUrl(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: "mint_t22_vault_raw",
			method: "solforgeMintTo",
			params: [
				TOKEN22_MINT.toBase58(),
				vault.toBase58(),
				mintAmount.toString(),
			],
		}),
	});
	const mintJson = (await mintResp.json()) as { error?: unknown };
	expect(mintJson.error, "mintTo should succeed").toBeUndefined();

	const recipient = Keypair.generate().publicKey;
	const fromTokenAccount = getAssociatedTokenAddressSync(
		TOKEN22_MINT,
		vault,
		true,
		TOKEN_2022_PROGRAM_ID,
	);
	const toTokenAccount = await ensureAta(
		connection,
		owner,
		TOKEN22_MINT,
		recipient,
		TOKEN_2022_PROGRAM_ID,
	);

	const beforeFrom = (
		await getSplAccount(
			connection,
			fromTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	let beforeTo = 0n;
	try {
		beforeTo = (
			await getSplAccount(
				connection,
				toTokenAccount,
				"confirmed",
				TOKEN_2022_PROGRAM_ID,
			)
		).amount;
	} catch {}

	const remainingAccounts: Array<{
		publicKey: PublicKey;
		isWritable: boolean;
		isSigner: boolean;
	}> = [];
	const upsert = (pk: PublicKey, w: boolean, s: boolean) => {
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
	const fromIdx = upsert(fromTokenAccount, true, false);
	const toIdx = upsert(toTokenAccount, true, false);
	const authIdx = upsert(vault, false, false);
	const sysIdx = upsert(SystemProgram.programId, false, false);
	const t22Idx = upsert(TOKEN_2022_PROGRAM_ID, false, false);
	const payerIdx = upsert(vault, true, false);

	const sendAmount = 100_000n; // 0.1 token
	const txIx = createTransferInstruction(
		fromTokenAccount,
		toTokenAccount,
		vault,
		Number(sendAmount),
		[],
		TOKEN_2022_PROGRAM_ID,
	);
	const instructions: Array<{
		programId: PublicKey;
		data: Buffer;
		accountIndices: Buffer;
		accountWriteFlags: boolean[];
	}> = [];
	// Create recipient ATA under Token-2022 first
	const createAtaIx2 = createAssociatedTokenAccountInstruction(
		vault,
		toTokenAccount,
		recipient,
		TOKEN22_MINT,
		TOKEN_2022_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID,
	);
	instructions.push({
		programId: ASSOCIATED_TOKEN_PROGRAM_ID,
		data: Buffer.from(createAtaIx2.data),
		accountIndices: Buffer.from([
			payerIdx,
			toIdx,
			upsert(recipient, false, false),
			upsert(TOKEN22_MINT, false, false),
			sysIdx,
			t22Idx,
		]),
		accountWriteFlags: [true, true, false, false, false, false],
	});
	// Then unchecked transfer
	instructions.push({
		programId: TOKEN_2022_PROGRAM_ID,
		data: Buffer.from(txIx.data),
		accountIndices: Buffer.from([fromIdx, toIdx, authIdx]),
		accountWriteFlags: [true, true, false],
	});

	await program.methods
		.executeTransaction(instructions as never)
		.accounts({ account: accountV2, vault, owner: owner.publicKey })
		.remainingAccounts(
			remainingAccounts.map((a) => ({
				pubkey: a.publicKey,
				isWritable: a.isWritable,
				isSigner: a.isSigner,
			})),
		)
		.signers([owner])
		.rpc();

	const afterFrom = (
		await getSplAccount(
			connection,
			fromTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	const afterTo = (
		await getSplAccount(
			connection,
			toTokenAccount,
			"confirmed",
			TOKEN_2022_PROGRAM_ID,
		)
	).amount;
	expect(afterTo - beforeTo).toBe(sendAmount);
	expect(beforeFrom - afterFrom).toBe(sendAmount);
});
