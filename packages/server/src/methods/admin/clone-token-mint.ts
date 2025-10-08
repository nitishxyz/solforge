import { MINT_SIZE, MintLayout } from "@solana/spl-token";
import type { AccountInfo } from "@solana/web3.js";
import { Connection, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import { cloneMintExtensionAccounts } from "./helpers";

export const solforgeAdminCloneTokenMint: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [mint, options] = params as [string, { endpoint?: string }?];
	if (!mint)
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params: mint required",
		);
	const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
	try {
		const conn = new Connection(endpoint, "confirmed");
		const mintPk = new PublicKey(mint);
		console.log(`[admin] clone mint start`, {
			mint: mintPk.toBase58(),
			endpoint,
		});
		const info = await conn.getAccountInfo(mintPk, "confirmed");
		if (!info) {
			console.warn(`[admin] clone mint: account not found`, {
				mint: mintPk.toBase58(),
				endpoint,
			});
			return context.createErrorResponse(
				id,
				-32004,
				"Mint account not found on endpoint",
				{ endpoint, mint },
			);
		}
		try {
			const dec = MintLayout.decode(
				(info.data as Buffer).slice(0, MINT_SIZE),
			).decimals;
			console.log(`[admin] clone mint fetched`, {
				owner: info.owner.toBase58(),
				dataLen: info.data.length,
				decimals: dec,
				lamports: info.lamports,
			});
		} catch {}
		// Write raw account into LiteSVM
		context.svm.setAccount(mintPk, {
			data: new Uint8Array(info.data),
			executable: info.executable,
			lamports: Number(info.lamports),
			owner: info.owner,
			rentEpoch: 0,
		});

		await cloneMintExtensionAccounts(
			conn,
			context,
			mintPk,
			info as AccountInfo<Buffer>,
		);
		try {
			context.registerMint?.(mintPk);
		} catch {}
		console.log(`[admin] clone mint done`, { mint: mintPk.toBase58() });
		return context.createSuccessResponse(id, { ok: true, address: mint });
	} catch (e) {
		console.error(`[admin] clone mint error`, e);
		return context.createErrorResponse(id, -32603, "Clone mint failed", {
			message: (e as Error)?.message || String(e),
			stack: (e as Error)?.stack,
			endpoint,
			mint,
		});
	}
};

export type { RpcMethodHandler } from "../../types";
