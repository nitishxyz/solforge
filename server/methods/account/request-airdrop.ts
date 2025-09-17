import {
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the requestAirdrop RPC method
 * @see https://docs.solana.com/api/http#requestairdrop
 */
export const requestAirdrop: RpcMethodHandler = (id, params, context) => {
	const [pubkeyStr, lamports, config] = params || [];

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
		const txMsg: any = tx.message as any;
		const rawKeys: any[] = Array.isArray(txMsg.staticAccountKeys)
			? txMsg.staticAccountKeys
			: Array.isArray(txMsg.accountKeys)
				? txMsg.accountKeys
				: [];
		const staticKeys = rawKeys.map((k: any) => {
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

		const sendResult = context.svm.sendTransaction(tx);
		// Surface errors to aid debugging
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const rawErrFun = (sendResult as any).err;
			const maybeErr =
				typeof rawErrFun === "function" ? rawErrFun() : rawErrFun;
			if (maybeErr) {
				let logsForErr: string[] = [];
				try {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const anyRes: any = sendResult;
					if (typeof anyRes?.logs === "function") logsForErr = anyRes.logs();
					else if (typeof anyRes?.meta === "function")
						logsForErr = anyRes.meta()?.logs?.() ?? [];
				} catch {}
				console.warn(
					"[requestAirdrop] transfer failed. err=",
					maybeErr,
					" logs=\n",
					logsForErr.join("\n"),
				);
			}
		} catch {}

		let signature = tx.signatures[0]
			? context.encodeBase58(tx.signatures[0])
			: context.encodeBase58(new Uint8Array(64).fill(0));
		context.notifySignature(signature);
		// Compute post balances and capture logs if available for explorer detail view
		let postBalances = staticKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk));
			} catch {
				return 0;
			}
		});
		let logs: string[] = [];
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const anyRes: any = sendResult;
			if (typeof anyRes?.logs === "function") logs = anyRes.logs();
			else if (typeof anyRes?.meta === "function")
				logs = anyRes.meta()?.logs?.() ?? [];
		} catch {}
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
					const e2 = (res2 as any).err?.() ?? (res2 as any).err;
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
		let recErr: any = null;
		try {
			const rawErrFun = (sendResult as any).err;
			recErr = typeof rawErrFun === "function" ? rawErrFun() : rawErrFun;
		} catch {}
		context.recordTransaction(signature, tx, {
			logs,
			fee: 5000,
			blockTime: Math.floor(Date.now() / 1000),
			preBalances,
			postBalances,
			err: recErr,
		});

		return context.createSuccessResponse(id, signature);
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params",
			error.message,
		);
	}
};
