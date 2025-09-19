import {
	ACCOUNT_SIZE,
	AccountLayout,
	MINT_SIZE,
	MintLayout,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const sendTransaction: RpcMethodHandler = (id, params, context) => {
	const [encodedTx] = params;
	try {
		const txData = Buffer.from(encodedTx, "base64");
		const tx = VersionedTransaction.deserialize(txData);

		// Snapshot pre balances
		const msg = tx.message as unknown as {
			staticAccountKeys?: unknown[];
			accountKeys?: unknown[];
		};
		const rawKeys: unknown[] = Array.isArray(msg.staticAccountKeys)
			? msg.staticAccountKeys
			: Array.isArray(msg.accountKeys)
				? msg.accountKeys
				: [];
		const staticKeys = rawKeys
			.map((k) => {
				try {
					return typeof k === "string" ? new PublicKey(k) : (k as PublicKey);
				} catch {
					return undefined;
				}
			})
			.filter(Boolean) as PublicKey[];
		const preBalances = staticKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk));
			} catch {
				return 0;
			}
		});

		// Collect SPL token accounts from instructions for pre/post token balance snapshots
		const msgAny = msg as unknown as {
			compiledInstructions?: unknown[];
			instructions?: unknown[];
		};
		const compiled: unknown[] = Array.isArray(msgAny.compiledInstructions)
			? msgAny.compiledInstructions
			: Array.isArray(msgAny.instructions)
				? msgAny.instructions
				: [];
		const tokenProgramIds = new Set([
			TOKEN_PROGRAM_ID.toBase58(),
			TOKEN_2022_PROGRAM_ID.toBase58(),
		]);
		const tokenAccountSet = new Set<string>();
		for (const ci of compiled) {
			try {
				const pid = staticKeys[ci.programIdIndex]?.toBase58();
				if (!pid || !tokenProgramIds.has(pid)) continue;
				const accIdxs: number[] = Array.isArray(ci.accountKeyIndexes)
					? ci.accountKeyIndexes
					: Array.isArray(ci.accounts)
						? ci.accounts
						: [];
				for (const ix of accIdxs) {
					const addr = staticKeys[ix]?.toBase58();
					if (addr) tokenAccountSet.add(addr);
				}
			} catch {}
		}
		// Pre token balances
		const preTokenBalances: unknown[] = [];
		const ataToInfo = new Map<
			string,
			{
				mint?: string;
				owner?: string;
				amount: bigint;
				accountIndex: number;
				decimals?: number;
			}
		>();
		const missingPre = new Set<string>();
		for (const addr of tokenAccountSet) {
			try {
				const pk = new PublicKey(addr);
				const idx = staticKeys.findIndex((k) => k.equals(pk));
				const acc = context.svm.getAccount(pk);
				if (!acc || (acc.data?.length ?? 0) < ACCOUNT_SIZE) {
					// Track placeholder; we'll fill mint/owner/decimals after send
					ataToInfo.set(addr, { amount: 0n, accountIndex: idx >= 0 ? idx : 0 });
					missingPre.add(addr);
					continue;
				}
				const decAcc = AccountLayout.decode(Buffer.from(acc.data));
				const mintPk = new PublicKey(decAcc.mint);
				const mintAcc = context.svm.getAccount(mintPk);
				let decimals = 0;
				if (mintAcc && (mintAcc.data?.length ?? 0) >= MINT_SIZE) {
					const m = MintLayout.decode(
						Buffer.from(mintAcc.data).slice(0, MINT_SIZE),
					);
					decimals = Number(m.decimals ?? 0);
				}
				const ownerPk = new PublicKey(decAcc.owner);
				const amt = BigInt(decAcc.amount.toString());
				ataToInfo.set(addr, {
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					amount: amt,
					accountIndex: idx >= 0 ? idx : 0,
					decimals,
				});
				const uiAmount = Number(amt) / 10 ** decimals;
				preTokenBalances.push({
					accountIndex: idx >= 0 ? idx : 0,
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					uiTokenAmount: {
						amount: amt.toString(),
						decimals,
						uiAmount,
						uiAmountString: String(uiAmount),
					},
				});
			} catch {}
		}

		const result = context.svm.sendTransaction(tx);

		try {
			const rawErr = (result as { err?: unknown }).err;
			const maybeErr =
				typeof rawErr === "function" ? (rawErr as () => unknown)() : rawErr;
			if (maybeErr) {
				return context.createErrorResponse(
					id,
					-32003,
					"Transaction failed",
					maybeErr,
				);
			}
		} catch {}

		const signature = tx.signatures[0]
			? context.encodeBase58(tx.signatures[0])
			: context.encodeBase58(new Uint8Array(64).fill(0));
		context.notifySignature(signature);
		// Snapshot post balances and capture logs for rich view
		const postBalances = staticKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk));
			} catch {
				return 0;
			}
		});
		// Post token balances
		const postTokenBalances: unknown[] = [];
		for (const addr of tokenAccountSet) {
			try {
				const pk = new PublicKey(addr);
				const idx = staticKeys.findIndex((k) => k.equals(pk));
				const acc = context.svm.getAccount(pk);
				if (!acc || (acc.data?.length ?? 0) < ACCOUNT_SIZE) continue;
				const decAcc = AccountLayout.decode(Buffer.from(acc.data));
				const mintPk = new PublicKey(decAcc.mint);
				const ownerPk = new PublicKey(decAcc.owner);
				const mintAcc = context.svm.getAccount(mintPk);
				let decimals = 0;
				if (mintAcc && (mintAcc.data?.length ?? 0) >= MINT_SIZE) {
					const m = MintLayout.decode(
						Buffer.from(mintAcc.data).slice(0, MINT_SIZE),
					);
					decimals = Number(m.decimals ?? 0);
				}
				const amt = BigInt(decAcc.amount.toString());
				const uiAmount = Number(amt) / 10 ** decimals;
				postTokenBalances.push({
					accountIndex:
						idx >= 0 ? idx : (ataToInfo.get(addr)?.accountIndex ?? 0),
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					uiTokenAmount: {
						amount: amt.toString(),
						decimals,
						uiAmount,
						uiAmountString: String(uiAmount),
					},
				});
				// Add missing pre entry as zero if account was unfunded before
				if (missingPre.has(addr)) {
					const preUi = 0;
					preTokenBalances.push({
						accountIndex:
							idx >= 0 ? idx : (ataToInfo.get(addr)?.accountIndex ?? 0),
						mint: mintPk.toBase58(),
						owner: ownerPk.toBase58(),
						uiTokenAmount: {
							amount: "0",
							decimals,
							uiAmount: preUi,
							uiAmountString: String(preUi),
						},
					});
				}
			} catch {}
		}
		let logs: string[] = [];
		try {
			const sr = result as {
				logs?: () => string[];
				meta?: () => { logs?: () => string[] } | undefined;
			};
			if (typeof sr?.logs === "function") logs = sr.logs();
			else if (typeof sr?.meta === "function") {
				const m = sr.meta();
				const lg = m?.logs;
				if (typeof lg === "function") logs = lg();
			}
		} catch {}
		context.recordTransaction(signature, tx, {
			logs,
			fee: 5000,
			blockTime: Math.floor(Date.now() / 1000),
			preBalances,
			postBalances,
			preTokenBalances,
			postTokenBalances,
		});

		return context.createSuccessResponse(id, signature);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(
			id,
			-32003,
			"Transaction failed",
			message,
		);
	}
};
