#!/usr/bin/env bun

/**
 * Test All Instruction Parsers
 *
 * This script creates transactions for every instruction type we've added parsers for.
 * Run the RPC server on 8899, then run this script to generate test transactions.
 * View the transactions in the Solana Explorer to verify parsing works correctly.
 *
 * Usage:
 *   1. Start RPC server: bun run dev (in one terminal)
 *   2. Run this script: bun run scripts/test-all-parsers.ts (in another terminal)
 *   3. Open explorer: http://localhost:3000
 */

import {
	Connection,
	Keypair,
	type PublicKey,
	SystemProgram,
	Transaction,
	sendAndConfirmTransaction,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
	TOKEN_PROGRAM_ID,
	TOKEN_2022_PROGRAM_ID,
	createInitializeMintInstruction,
	createInitializeMint2Instruction,
	createInitializeAccountInstruction,
	createInitializeAccount2Instruction,
	createInitializeAccount3Instruction,
	createMintToInstruction,
	createMintToCheckedInstruction,
	createTransferInstruction,
	createTransferCheckedInstruction,
	createApproveInstruction,
	createApproveCheckedInstruction,
	createRevokeInstruction,
	createBurnInstruction,
	createBurnCheckedInstruction,
	createCloseAccountInstruction,
	createFreezeAccountInstruction,
	createThawAccountInstruction,
	createSetAuthorityInstruction,
	createSyncNativeInstruction,
	createInitializeMultisigInstruction,
	AuthorityType,
	NATIVE_MINT,
	createAssociatedTokenAccountInstruction,
	getAssociatedTokenAddress,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	createInitializeTransferFeeConfigInstruction,
	createTransferCheckedWithFeeInstruction,
	createWithdrawWithheldTokensFromMintInstruction,
	createSetTransferFeeInstruction,
	ExtensionType,
	getMintLen,
} from "@solana/spl-token";

const RPC_URL = "http://localhost:8899";
const EXPLORER_BASE_URL = "http://localhost:3000";

interface TestResult {
	name: string;
	signature: string;
	success: boolean;
	error?: string;
	explorerUrl: string;
}

const results: TestResult[] = [];

function logResult(
	name: string,
	signature: string,
	success: boolean,
	error?: string,
) {
	const explorerUrl = `${EXPLORER_BASE_URL}/tx/${signature}`;
	results.push({ name, signature, success, error, explorerUrl });

	if (success) {
		console.log(`✅ ${name}`);
		console.log(`   Signature: ${signature}`);
		console.log(`   Explorer: ${explorerUrl}\n`);
	} else {
		console.log(`❌ ${name}`);
		console.log(`   Error: ${error}`);
		console.log(`   Signature: ${signature}\n`);
	}
}

async function airdrop(
	connection: Connection,
	publicKey: PublicKey,
	amount: number,
) {
	const sig = await connection.requestAirdrop(publicKey, amount);
	await connection.confirmTransaction(sig);
}

async function main() {
	console.log("🚀 Testing All Instruction Parsers\n");
	console.log(`📡 RPC: ${RPC_URL}`);
	console.log(`🔍 Explorer: ${EXPLORER_BASE_URL}\n`);

	const connection = new Connection(RPC_URL, "confirmed");

	// Create test keypairs
	const payer = Keypair.generate();
	const mintAuthority = Keypair.generate();
	const freezeAuthority = Keypair.generate();
	const owner = Keypair.generate();
	const delegate = Keypair.generate();
	const recipient = Keypair.generate();

	console.log("💰 Funding accounts...\n");
	await airdrop(connection, payer.publicKey, 10 * LAMPORTS_PER_SOL);
	await airdrop(connection, owner.publicKey, 5 * LAMPORTS_PER_SOL);
	await airdrop(connection, delegate.publicKey, 2 * LAMPORTS_PER_SOL);

	// Test accounts
	const mint = Keypair.generate();
	const mint2 = Keypair.generate();
	const tokenAccount = Keypair.generate();
	const tokenAccount2 = Keypair.generate();
	const tokenAccount3 = Keypair.generate();

	console.log("📝 Test Accounts:");
	console.log(`   Payer: ${payer.publicKey.toBase58()}`);
	console.log(`   Owner: ${owner.publicKey.toBase58()}`);
	console.log(`   Delegate: ${delegate.publicKey.toBase58()}\n`);

	// ===========================
	// MINT INITIALIZATION TESTS
	// ===========================

	console.log("🏭 Testing Mint Initialization Instructions...\n");

	// 1. InitializeMint (with rent sysvar)
	try {
		const lamports = await connection.getMinimumBalanceForRentExemption(82);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: mint.publicKey,
				space: 82,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeMintInstruction(
				mint.publicKey,
				9,
				mintAuthority.publicKey,
				freezeAuthority.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
		logResult("InitializeMint", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeMint",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 2. InitializeMint2 (without rent sysvar)
	try {
		const lamports = await connection.getMinimumBalanceForRentExemption(82);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: mint2.publicKey,
				space: 82,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeMint2Instruction(
				mint2.publicKey,
				6,
				mintAuthority.publicKey,
				freezeAuthority.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint2]);
		logResult("InitializeMint2", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeMint2",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// ACCOUNT INITIALIZATION TESTS
	// ===========================

	console.log("💼 Testing Account Initialization Instructions...\n");

	// 3. InitializeAccount (with rent sysvar)
	try {
		const lamports = await connection.getMinimumBalanceForRentExemption(165);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: tokenAccount.publicKey,
				space: 165,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeAccountInstruction(
				tokenAccount.publicKey,
				mint.publicKey,
				owner.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			tokenAccount,
		]);
		logResult("InitializeAccount", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeAccount",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 4. InitializeAccount2
	try {
		const lamports = await connection.getMinimumBalanceForRentExemption(165);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: tokenAccount2.publicKey,
				space: 165,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeAccount2Instruction(
				tokenAccount2.publicKey,
				mint.publicKey,
				owner.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			tokenAccount2,
		]);
		logResult("InitializeAccount2", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeAccount2",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 5. InitializeAccount3
	try {
		const lamports = await connection.getMinimumBalanceForRentExemption(165);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: tokenAccount3.publicKey,
				space: 165,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeAccount3Instruction(
				tokenAccount3.publicKey,
				mint2.publicKey,
				owner.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			tokenAccount3,
		]);
		logResult("InitializeAccount3", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeAccount3",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 6. Associated Token Account (Create)
	try {
		const ata = await getAssociatedTokenAddress(
			mint.publicKey,
			payer.publicKey,
			false,
			TOKEN_PROGRAM_ID,
			ASSOCIATED_TOKEN_PROGRAM_ID,
		);

		const tx = new Transaction().add(
			createAssociatedTokenAccountInstruction(
				payer.publicKey,
				ata,
				payer.publicKey,
				mint.publicKey,
				TOKEN_PROGRAM_ID,
				ASSOCIATED_TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
		logResult("Create Associated Token Account", sig, true);
	} catch (e: unknown) {
		logResult(
			"Create Associated Token Account",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// MINTING TESTS
	// ===========================

	console.log("🪙 Testing Minting Instructions...\n");

	// 7. MintTo
	try {
		const tx = new Transaction().add(
			createMintToInstruction(
				mint.publicKey,
				tokenAccount.publicKey,
				mintAuthority.publicKey,
				1_000_000_000n, // 1 token with 9 decimals
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			mintAuthority,
		]);
		logResult("MintTo", sig, true);
	} catch (e: unknown) {
		logResult("MintTo", "", false, e instanceof Error ? e.message : String(e));
	}

	// 8. MintToChecked
	try {
		const tx = new Transaction().add(
			createMintToCheckedInstruction(
				mint.publicKey,
				tokenAccount2.publicKey,
				mintAuthority.publicKey,
				2_000_000_000n, // 2 tokens
				9, // decimals
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			mintAuthority,
		]);
		logResult("MintToChecked", sig, true);
	} catch (e: unknown) {
		logResult(
			"MintToChecked",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// TRANSFER TESTS
	// ===========================

	console.log("💸 Testing Transfer Instructions...\n");

	// 9. Transfer
	try {
		const tx = new Transaction().add(
			createTransferInstruction(
				tokenAccount.publicKey,
				tokenAccount2.publicKey,
				owner.publicKey,
				100_000_000n, // 0.1 token
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("Transfer", sig, true);
	} catch (e: unknown) {
		logResult(
			"Transfer",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 10. TransferChecked
	try {
		const tx = new Transaction().add(
			createTransferCheckedInstruction(
				tokenAccount2.publicKey,
				mint.publicKey,
				tokenAccount.publicKey,
				owner.publicKey,
				50_000_000n, // 0.05 token
				9,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("TransferChecked", sig, true);
	} catch (e: unknown) {
		logResult(
			"TransferChecked",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// APPROVAL TESTS
	// ===========================

	console.log("🔐 Testing Approval Instructions...\n");

	// 11. Approve
	try {
		const tx = new Transaction().add(
			createApproveInstruction(
				tokenAccount.publicKey,
				delegate.publicKey,
				owner.publicKey,
				500_000_000n, // 0.5 token
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("Approve", sig, true);
	} catch (e: unknown) {
		logResult("Approve", "", false, e instanceof Error ? e.message : String(e));
	}

	// 12. ApproveChecked
	try {
		const tx = new Transaction().add(
			createApproveCheckedInstruction(
				tokenAccount2.publicKey,
				mint.publicKey,
				delegate.publicKey,
				owner.publicKey,
				300_000_000n, // 0.3 token
				9,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("ApproveChecked", sig, true);
	} catch (e: unknown) {
		logResult(
			"ApproveChecked",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 13. Transfer by delegate
	try {
		const tx = new Transaction().add(
			createTransferInstruction(
				tokenAccount.publicKey,
				tokenAccount2.publicKey,
				delegate.publicKey, // Delegate transferring
				10_000_000n, // 0.01 token
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			delegate,
		]);
		logResult("Transfer (by delegate)", sig, true);
	} catch (e: unknown) {
		logResult(
			"Transfer (by delegate)",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 14. Revoke
	try {
		const tx = new Transaction().add(
			createRevokeInstruction(
				tokenAccount.publicKey,
				owner.publicKey,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("Revoke", sig, true);
	} catch (e: unknown) {
		logResult("Revoke", "", false, e instanceof Error ? e.message : String(e));
	}

	// ===========================
	// BURN TESTS
	// ===========================

	console.log("🔥 Testing Burn Instructions...\n");

	// 15. Burn
	try {
		const tx = new Transaction().add(
			createBurnInstruction(
				tokenAccount.publicKey,
				mint.publicKey,
				owner.publicKey,
				50_000_000n, // 0.05 token
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("Burn", sig, true);
	} catch (e: unknown) {
		logResult("Burn", "", false, e instanceof Error ? e.message : String(e));
	}

	// 16. BurnChecked
	try {
		const tx = new Transaction().add(
			createBurnCheckedInstruction(
				tokenAccount2.publicKey,
				mint.publicKey,
				owner.publicKey,
				25_000_000n, // 0.025 token
				9,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("BurnChecked", sig, true);
	} catch (e: unknown) {
		logResult(
			"BurnChecked",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// FREEZE/THAW TESTS
	// ===========================

	console.log("❄️ Testing Freeze/Thaw Instructions...\n");

	// 17. FreezeAccount
	try {
		const tx = new Transaction().add(
			createFreezeAccountInstruction(
				tokenAccount.publicKey,
				mint.publicKey,
				freezeAuthority.publicKey,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			freezeAuthority,
		]);
		logResult("FreezeAccount", sig, true);
	} catch (e: unknown) {
		logResult(
			"FreezeAccount",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 18. ThawAccount
	try {
		const tx = new Transaction().add(
			createThawAccountInstruction(
				tokenAccount.publicKey,
				mint.publicKey,
				freezeAuthority.publicKey,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			freezeAuthority,
		]);
		logResult("ThawAccount", sig, true);
	} catch (e: unknown) {
		logResult(
			"ThawAccount",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// AUTHORITY TESTS
	// ===========================

	console.log("👑 Testing Authority Instructions...\n");

	// 19. SetAuthority (change mint authority)
	try {
		const newAuthority = Keypair.generate();
		const tx = new Transaction().add(
			createSetAuthorityInstruction(
				mint.publicKey,
				mintAuthority.publicKey,
				AuthorityType.MintTokens,
				newAuthority.publicKey,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			mintAuthority,
		]);
		logResult("SetAuthority (MintTokens)", sig, true);
	} catch (e: unknown) {
		logResult(
			"SetAuthority (MintTokens)",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// 20. SetAuthority (disable freeze)
	try {
		const tx = new Transaction().add(
			createSetAuthorityInstruction(
				mint2.publicKey,
				freezeAuthority.publicKey,
				AuthorityType.FreezeAccount,
				null, // Disable freeze
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			freezeAuthority,
		]);
		logResult("SetAuthority (Disable Freeze)", sig, true);
	} catch (e: unknown) {
		logResult(
			"SetAuthority (Disable Freeze)",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// MULTISIG TESTS
	// ===========================

	console.log("👥 Testing Multisig Instructions...\n");

	// 21. InitializeMultisig
	try {
		const multisig = Keypair.generate();
		const signer1 = Keypair.generate();
		const signer2 = Keypair.generate();
		const signer3 = Keypair.generate();

		const lamports = await connection.getMinimumBalanceForRentExemption(355);
		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: multisig.publicKey,
				space: 355,
				lamports,
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeMultisigInstruction(
				multisig.publicKey,
				[signer1.publicKey, signer2.publicKey, signer3.publicKey],
				2, // 2 of 3
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			multisig,
		]);
		logResult("InitializeMultisig", sig, true);
	} catch (e: unknown) {
		logResult(
			"InitializeMultisig",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// Note: InitializeMultisig2 skipped - no create function in SDK yet

	// ===========================
	// WRAPPED SOL TEST
	// ===========================

	console.log("🌯 Testing Wrapped SOL Instructions...\n");

	// 23. SyncNative
	try {
		// Create wrapped SOL account
		const wrappedSolAccount = Keypair.generate();
		const lamports = await connection.getMinimumBalanceForRentExemption(165);

		const createTx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: wrappedSolAccount.publicKey,
				space: 165,
				lamports: lamports + LAMPORTS_PER_SOL, // Rent + 1 SOL
				programId: TOKEN_PROGRAM_ID,
			}),
			createInitializeAccount3Instruction(
				wrappedSolAccount.publicKey,
				NATIVE_MINT,
				owner.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		await sendAndConfirmTransaction(connection, createTx, [
			payer,
			wrappedSolAccount,
		]);

		// Now sync it
		const syncTx = new Transaction().add(
			createSyncNativeInstruction(
				wrappedSolAccount.publicKey,
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, syncTx, [payer]);
		logResult("SyncNative", sig, true);
	} catch (e: unknown) {
		logResult(
			"SyncNative",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// CLOSE ACCOUNT TEST
	// ===========================

	console.log("🗑️ Testing Close Account Instruction...\n");

	// 24. CloseAccount
	try {
		const tx = new Transaction().add(
			createCloseAccountInstruction(
				tokenAccount3.publicKey,
				payer.publicKey,
				owner.publicKey,
				[],
				TOKEN_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [payer, owner]);
		logResult("CloseAccount", sig, true);
	} catch (e: unknown) {
		logResult(
			"CloseAccount",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// TOKEN-2022 EXTENSION TESTS
	// ===========================

	console.log("🔧 Testing Token-2022 Extension Instructions...\n");

	// 25. InitializeTransferFeeConfig (Token-2022)
	try {
		const feeMint = Keypair.generate();
		const feeAuthority = Keypair.generate();
		const withdrawAuthority = Keypair.generate();

		const extensions = [ExtensionType.TransferFeeConfig];
		const mintLen = getMintLen(extensions);
		const lamports =
			await connection.getMinimumBalanceForRentExemption(mintLen);

		const tx = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: payer.publicKey,
				newAccountPubkey: feeMint.publicKey,
				space: mintLen,
				lamports,
				programId: TOKEN_2022_PROGRAM_ID,
			}),
			createInitializeTransferFeeConfigInstruction(
				feeMint.publicKey,
				feeAuthority.publicKey,
				withdrawAuthority.publicKey,
				100, // 1% fee (100 basis points)
				BigInt(1000000), // 1 token max fee
				TOKEN_2022_PROGRAM_ID,
			),
			createInitializeMint2Instruction(
				feeMint.publicKey,
				9,
				mintAuthority.publicKey,
				null,
				TOKEN_2022_PROGRAM_ID,
			),
		);

		const sig = await sendAndConfirmTransaction(connection, tx, [
			payer,
			feeMint,
		]);
		logResult("InitializeTransferFeeConfig (Token-2022)", sig, true);

		// 26. TransferCheckedWithFee (requires fee mint setup)
		try {
			const feeSource = await getAssociatedTokenAddress(
				feeMint.publicKey,
				owner.publicKey,
				false,
				TOKEN_2022_PROGRAM_ID,
			);
			const feeDestination = await getAssociatedTokenAddress(
				feeMint.publicKey,
				recipient.publicKey,
				false,
				TOKEN_2022_PROGRAM_ID,
			);

			// Create accounts
			const createTx = new Transaction().add(
				createAssociatedTokenAccountInstruction(
					payer.publicKey,
					feeSource,
					owner.publicKey,
					feeMint.publicKey,
					TOKEN_2022_PROGRAM_ID,
					ASSOCIATED_TOKEN_PROGRAM_ID,
				),
				createAssociatedTokenAccountInstruction(
					payer.publicKey,
					feeDestination,
					recipient.publicKey,
					feeMint.publicKey,
					TOKEN_2022_PROGRAM_ID,
					ASSOCIATED_TOKEN_PROGRAM_ID,
				),
			);
			await sendAndConfirmTransaction(connection, createTx, [payer]);

			// Mint tokens
			const mintTx = new Transaction().add(
				createMintToCheckedInstruction(
					feeMint.publicKey,
					feeSource,
					mintAuthority.publicKey,
					BigInt(100_000_000_000), // 100 tokens
					9,
					[],
					TOKEN_2022_PROGRAM_ID,
				),
			);
			await sendAndConfirmTransaction(connection, mintTx, [
				payer,
				mintAuthority,
			]);

			// Transfer with fee
			const transferAmount = BigInt(10_000_000_000); // 10 tokens
			const expectedFee = BigInt(100_000_000); // 1% of 10 tokens = 0.1 tokens

			const transferTx = new Transaction().add(
				createTransferCheckedWithFeeInstruction(
					feeSource,
					feeMint.publicKey,
					feeDestination,
					owner.publicKey,
					transferAmount,
					9,
					expectedFee,
					[],
					TOKEN_2022_PROGRAM_ID,
				),
			);

			const sig2 = await sendAndConfirmTransaction(connection, transferTx, [
				payer,
				owner,
			]);
			logResult("TransferCheckedWithFee (Token-2022)", sig2, true);

			// 27. WithdrawWithheldTokensFromMint
			try {
				const withdrawDestination = await getAssociatedTokenAddress(
					feeMint.publicKey,
					withdrawAuthority.publicKey,
					false,
					TOKEN_2022_PROGRAM_ID,
				);

				const createWithdrawTx = new Transaction().add(
					createAssociatedTokenAccountInstruction(
						payer.publicKey,
						withdrawDestination,
						withdrawAuthority.publicKey,
						feeMint.publicKey,
						TOKEN_2022_PROGRAM_ID,
						ASSOCIATED_TOKEN_PROGRAM_ID,
					),
				);
				await sendAndConfirmTransaction(connection, createWithdrawTx, [payer]);

				const withdrawTx = new Transaction().add(
					createWithdrawWithheldTokensFromMintInstruction(
						feeMint.publicKey,
						withdrawDestination,
						withdrawAuthority.publicKey,
						[],
						TOKEN_2022_PROGRAM_ID,
					),
				);

				const sig3 = await sendAndConfirmTransaction(connection, withdrawTx, [
					payer,
					withdrawAuthority,
				]);
				logResult("WithdrawWithheldTokensFromMint (Token-2022)", sig3, true);
			} catch (e: unknown) {
				logResult(
					"WithdrawWithheldTokensFromMint (Token-2022)",
					"",
					false,
					e.message,
				);
			}

			// 28. SetTransferFee
			try {
				const setFeeTx = new Transaction().add(
					createSetTransferFeeInstruction(
						feeMint.publicKey,
						feeAuthority.publicKey,
						[],
						200, // Update to 2% fee
						BigInt(2000000), // 2 token max fee
						TOKEN_2022_PROGRAM_ID,
					),
				);

				const sig4 = await sendAndConfirmTransaction(connection, setFeeTx, [
					payer,
					feeAuthority,
				]);
				logResult("SetTransferFee (Token-2022)", sig4, true);
			} catch (e: unknown) {
				logResult(
					"SetTransferFee (Token-2022)",
					"",
					false,
					e instanceof Error ? e.message : String(e),
				);
			}
		} catch (e: unknown) {
			logResult(
				"TransferCheckedWithFee (Token-2022)",
				"",
				false,
				e instanceof Error ? e.message : String(e),
			);
		}
	} catch (e: unknown) {
		logResult(
			"InitializeTransferFeeConfig (Token-2022)",
			"",
			false,
			e instanceof Error ? e.message : String(e),
		);
	}

	// ===========================
	// SUMMARY
	// ===========================

	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 TEST SUMMARY");
	console.log(`${"=".repeat(80)}\n`);

	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	console.log(`✅ Successful: ${successful.length}/${results.length}`);
	console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

	if (successful.length > 0) {
		console.log("🎉 Successfully Tested Instructions:\n");
		successful.forEach((r) => {
			console.log(`   • ${r.name}`);
			console.log(`     ${r.explorerUrl}`);
		});
		console.log("");
	}

	if (failed.length > 0) {
		console.log("❌ Failed Instructions:\n");
		failed.forEach((r) => {
			console.log(`   • ${r.name}: ${r.error}`);
		});
		console.log("");
	}

	console.log("🔍 View all transactions in the explorer:");
	console.log(`   ${EXPLORER_BASE_URL}\n`);

	console.log("💡 TIP: Search for these addresses in the explorer:");
	console.log(`   Payer: ${payer.publicKey.toBase58()}`);
	console.log(`   Owner: ${owner.publicKey.toBase58()}`);
	console.log(`   Mint 1: ${mint.publicKey.toBase58()}`);
	console.log(`   Mint 2: ${mint2.publicKey.toBase58()}\n`);
}

main().catch((err) => {
	console.error("❌ Fatal error:", err);
	process.exit(1);
});
