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
	createTransferInstruction,
	getAssociatedTokenAddressSync,
	getAccount as getSplAccount,
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

test("executeTransaction sends USDC via raw Transfer (unchecked)", async () => {
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

	// Initialize smart wallet
	const routeId = `usdc_raw_${Date.now().toString(36).slice(-6)}`;
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

	// Mint some USDC to vault
	const mintAmount = 2_000_000n; // 2 USDC
	const rpcRes = await fetch(rpcUrl(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: "mint_to_vault_raw",
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

	// Check if recipient ATA exists; if not, create via executeTransaction (as first ix)
	const toInfo = await connection.getAccountInfo(toTokenAccount, "confirmed");

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

	// vault must be the payer for Ixs executed by the program (invoke_signed)
	const payerIdx = upsert(vaultV2, true, false);
	// include owner as signer to fund vault for rent via SystemProgram.transfer
	const ownerSignerIdx = upsert(payer.publicKey, true, true);
	const systemIdx = upsert(SystemProgram.programId, false, false);
	const tokenIdx = upsert(TOKEN_PROGRAM_ID, false, false);
	const _ataProgIdx = upsert(ASSOCIATED_TOKEN_PROGRAM_ID, false, false);
	const mintIdx = upsert(USDC_MINT, false, false);
	const fromAtaIdx = upsert(fromTokenAccount, true, false);
	const toAtaIdx = upsert(toTokenAccount, true, false);
	const ownerIdx = upsert(recipient, false, false);
	const vaultIdx = upsert(vaultV2, false, false);

	const instructions: Array<{
		programId: PublicKey;
		data: Buffer;
		accountIndices: Buffer;
		accountWriteFlags: boolean[];
	}> = [];
	// 0) fund vault for ATA rent
	instructions.push({
		programId: SystemProgram.programId,
		data: Buffer.from(
			SystemProgram.transfer({
				fromPubkey: payer.publicKey,
				toPubkey: vaultV2,
				lamports: 1_000_000,
			}).data,
		),
		accountIndices: Buffer.from([ownerSignerIdx, upsert(vaultV2, true, false)]),
		accountWriteFlags: [true, true],
	});

	if (!toInfo) {
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
			]),
			accountWriteFlags: [true, true, false, false, false, false],
		});
	}

	// Build unchecked transfer (no decimals included)
	const sendAmount = 150_000n; // 0.15 USDC in base units
	const transferIx = createTransferInstruction(
		fromTokenAccount,
		toTokenAccount,
		vaultV2,
		Number(sendAmount),
	);
	// Keys for unchecked transfer: [source, destination, owner]
	instructions.push({
		programId: TOKEN_PROGRAM_ID,
		data: Buffer.from(transferIx.data),
		accountIndices: Buffer.from([fromAtaIdx, toAtaIdx, vaultIdx]),
		accountWriteFlags: [true, true, false],
	});

	// Capture pre balances (recipient ATA may not exist yet)
	const beforeFrom = (
		await getSplAccount(connection, fromTokenAccount, "confirmed")
	).amount;
	let beforeTo = 0n;
	try {
		beforeTo = (await getSplAccount(connection, toTokenAccount, "confirmed"))
			.amount;
	} catch {}

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

	// Verify balances changed
	const afterFrom = (
		await getSplAccount(connection, fromTokenAccount, "confirmed")
	).amount;
	const afterTo = (await getSplAccount(connection, toTokenAccount, "confirmed"))
		.amount;

	expect(beforeFrom >= sendAmount).toBe(true);
	expect(afterTo - beforeTo).toBe(sendAmount);
	expect(beforeFrom - afterFrom).toBe(sendAmount);
});
