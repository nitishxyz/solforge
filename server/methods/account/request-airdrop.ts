import {
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import { sendTransaction as sendTxRpc } from "../transaction/send-transaction";

/**
 * Implements the requestAirdrop RPC method
 * @see https://docs.solana.com/api/http#requestairdrop
 */
export const requestAirdrop: RpcMethodHandler = async (id, params, context) => {
	const [pubkeyStr, lamports, _config] = params || [];

	try {
		const toPubkey = new PublicKey(pubkeyStr);
		const faucet = context.getFaucet();
		// Use SVM's latest blockhash; uniqueness ensured via memo nonce
		let recentBlockhash: string | undefined;
		try {
			recentBlockhash = context.svm.latestBlockhash();
		} catch {}
		if (!recentBlockhash) {
			const bh = new Uint8Array(32);
			crypto.getRandomValues(bh);
			recentBlockhash = context.encodeBase58(bh);
		}

		// No per-request top-up; faucet is funded heavily at startup

		const ix = SystemProgram.transfer({
			fromPubkey: faucet.publicKey,
			toPubkey,
			lamports: Number(BigInt(lamports)),
		});
		// Add a memo with random nonce to guarantee unique signatures
		const memoProgramId = new PublicKey(
			"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
		);
		const nonce = new Uint8Array(8);
		crypto.getRandomValues(nonce);
		const memoIx = new TransactionInstruction({
			keys: [],
			programId: memoProgramId,
			data: Buffer.from(`airdrop:${Buffer.from(nonce).toString("hex")}`),
		});

		const messageV0 = new TransactionMessage({
			payerKey: faucet.publicKey,
			recentBlockhash,
			instructions: [ix, memoIx],
		});
		// Prefer legacy message for maximum LiteSVM compatibility
		const compiled = messageV0.compileToLegacyMessage();

		const tx = new VersionedTransaction(compiled);
		tx.sign([faucet]);

		// Compute pre balances for all static account keys
		const msg = tx.message as unknown as {
			staticAccountKeys?: unknown;
			accountKeys?: unknown;
		};
		const rawKeys = Array.isArray(msg.staticAccountKeys)
			? (msg.staticAccountKeys as unknown[])
			: Array.isArray(msg.accountKeys)
				? (msg.accountKeys as unknown[])
				: [];
		const staticKeys = rawKeys.map((k) => {
			try {
				return typeof k === "string" ? new PublicKey(k) : (k as PublicKey);
			} catch {
				return faucet.publicKey;
			}
		});
		const preBalances = staticKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk));
			} catch {
				return 0;
			}
		});
		const preAccountStates = staticKeys.map((pk) => {
			try {
				const addr = pk.toBase58();
				const acc = context.svm.getAccount(pk);
				if (!acc) return { address: addr, pre: null } as const;
				return {
					address: addr,
					pre: {
						lamports: Number(acc.lamports || 0n),
						ownerProgram: new PublicKey(acc.owner).toBase58(),
						executable: !!acc.executable,
						rentEpoch: Number(acc.rentEpoch || 0),
						dataLen: acc.data?.length ?? 0,
						dataBase64: undefined,
						lastSlot: Number(context.slot),
					},
				} as const;
			} catch {
				return { address: pk.toBase58(), pre: null } as const;
			}
		});
		try {
			if (process.env.DEBUG_TX_CAPTURE === "1") {
				console.debug(
					`[tx-capture] pre snapshots: keys=${staticKeys.length} captured=${preAccountStates.length}`,
				);
			}
		} catch {}
		const toIndex = staticKeys.findIndex((pk) => pk.equals(toPubkey));
		const beforeTo =
			toIndex >= 0
				? preBalances[toIndex]
				: (() => {
						try {
							return Number(context.svm.getBalance(toPubkey));
						} catch {
							return 0;
						}
					})();

		// Send via standard sendTransaction RPC to unify capture + persistence
		const rawB64 = Buffer.from(tx.serialize()).toString("base64");
		const resp = await (sendTxRpc as RpcMethodHandler)(id, [rawB64], context);
		if (
			resp &&
			typeof resp === "object" &&
			"error" in (resp as Record<string, unknown>) &&
			(resp as Record<string, unknown>).error != null
		) {
			return resp;
		}
		// Any send errors would have been returned by send-transaction already

		let signature = (() => {
			try {
				const r = resp as Record<string, unknown>;
				const v = r?.result;
				return v == null ? "" : String(v);
			} catch {
				return "";
			}
		})();
		if (!signature) {
			signature = tx.signatures[0]
				? context.encodeBase58(tx.signatures[0])
				: context.encodeBase58(new Uint8Array(64).fill(0));
		}
		try {
			context.notifySignature(signature);
		} catch {}
		// Compute post balances and capture logs if available for explorer detail view
		let postBalances = staticKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk));
			} catch {
				return 0;
			}
		});
		const postAccountStates = staticKeys.map((pk) => {
			try {
				const addr = pk.toBase58();
				const acc = context.svm.getAccount(pk);
				if (!acc) return { address: addr, post: null } as const;
				return {
					address: addr,
					post: {
						lamports: Number(acc.lamports || 0n),
						ownerProgram: new PublicKey(acc.owner).toBase58(),
						executable: !!acc.executable,
						rentEpoch: Number(acc.rentEpoch || 0),
						dataLen: acc.data?.length ?? 0,
						dataBase64: undefined,
						lastSlot: Number(context.slot),
					},
				} as const;
			} catch {
				return { address: pk.toBase58(), post: null } as const;
			}
		});
		try {
			if (process.env.DEBUG_TX_CAPTURE === "1") {
				console.debug(
					`[tx-capture] post snapshots: keys=${staticKeys.length} captured=${postAccountStates.length}`,
				);
			}
		} catch {}
		// Parsing, recording etc. are performed by send-transaction
		// Verify recipient received lamports; retry once if not
		const afterTo =
			toIndex >= 0
				? postBalances[toIndex]
				: (() => {
						try {
							return Number(context.svm.getBalance(toPubkey));
						} catch {
							return 0;
						}
					})();
		const expectedDelta = Number(BigInt(lamports));
		if (afterTo - beforeTo < expectedDelta) {
			// Retry once with fresh blockhash + memo
			try {
				const bh2 = new Uint8Array(32);
				crypto.getRandomValues(bh2);
				const rb2 = context.encodeBase58(bh2);
				const memoProgramId2 = new PublicKey(
					"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
				);
				const nonce2 = new Uint8Array(8);
				crypto.getRandomValues(nonce2);
				const memoIx2 = new TransactionInstruction({
					keys: [],
					programId: memoProgramId2,
					data: Buffer.from(
						`airdrop-retry:${Buffer.from(nonce2).toString("hex")}`,
					),
				});
				const msg2 = new TransactionMessage({
					payerKey: faucet.publicKey,
					recentBlockhash: rb2,
					instructions: [ix, memoIx2],
				}).compileToV0Message();
				const tx2 = new VersionedTransaction(msg2);
				tx2.sign([faucet]);
				const res2 = context.svm.sendTransaction(tx2);
				try {
					const e2Raw = (res2 as { err?: unknown }).err;
					const e2 =
						typeof e2Raw === "function" ? (e2Raw as () => unknown)() : e2Raw;
					if (e2) console.warn("[requestAirdrop] retry failed:", e2);
				} catch {}
				signature = tx2.signatures[0]
					? context.encodeBase58(tx2.signatures[0])
					: signature;
				context.notifySignature(signature);
				postBalances = staticKeys.map((pk) => {
					try {
						return Number(context.svm.getBalance(pk));
					} catch {
						return 0;
					}
				});
			} catch {}
		}

		// Try to capture error again for accurate status reporting
		// No additional error capture; send-transaction has already recorded it
		// Pre/post snapshots are still useful for account cache; we can upsert
		try {
			const snapshots = new Map<string, { pre?: unknown; post?: unknown }>();
			for (const s of preAccountStates)
				snapshots.set(s.address, { pre: s.pre || null });
			for (const s of postAccountStates) {
				const e = snapshots.get(s.address) || {};
				e.post = s.post || null;
				snapshots.set(s.address, e);
			}
			// Not persisted here; DB already has the transaction via send-transaction
		} catch {}

		return context.createSuccessResponse(id, signature);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
