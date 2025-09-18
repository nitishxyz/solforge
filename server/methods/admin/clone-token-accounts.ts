import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const solforgeAdminCloneTokenAccounts: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [mint, options] = params as [
		string,
		{ endpoint?: string; holders?: number; allAccounts?: boolean }?,
	];
	if (!mint)
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params: mint required",
		);
	const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
	const limit =
		options?.holders && !options?.allAccounts
			? Math.max(1, Math.min(10000, options.holders))
			: undefined;
	try {
		const conn = new Connection(endpoint, "confirmed");
		const mintPk = new PublicKey(mint);
		let accounts: Array<{
			pubkey: PublicKey;
			data: Buffer;
			lamports: number;
			owner: PublicKey;
			executable: boolean;
			rentEpoch: number;
		}>;
		if (options?.allAccounts) {
			const list = await conn.getProgramAccounts(TOKEN_PROGRAM_ID, {
				commitment: "confirmed",
				filters: [
					{ dataSize: 165 },
					{ memcmp: { offset: 0, bytes: mintPk.toBase58() } },
				],
			});
			accounts = list.map(({ pubkey, account }) => ({
				pubkey,
				data: account.data as Buffer,
				lamports: account.lamports,
				owner: account.owner,
				executable: account.executable,
				rentEpoch: account.rentEpoch,
			}));
		} else if (typeof limit === "number") {
			const largest = await conn.getTokenLargestAccounts(mintPk, "confirmed");
			const addrs = largest.value.slice(0, limit).map((x) => x.address);
			const multi = await conn.getMultipleAccountsInfo(addrs, {
				commitment: "confirmed",
			});
			accounts = [];
			for (let i = 0; i < addrs.length; i++) {
				const info = multi[i];
				const pk = addrs[i];
				if (!info || !pk) continue;
				accounts.push({
					pubkey: pk,
					data: info.data as Buffer,
					lamports: info.lamports,
					owner: info.owner,
					executable: info.executable,
					rentEpoch: info.rentEpoch,
				});
			}
		} else {
			const largest = await conn.getTokenLargestAccounts(mintPk, "confirmed");
			const addrs = largest.value.slice(0, 100).map((x) => x.address);
			const multi = await conn.getMultipleAccountsInfo(addrs, {
				commitment: "confirmed",
			});
			accounts = [];
			for (let i = 0; i < addrs.length; i++) {
				const info = multi[i];
				const pk = addrs[i];
				if (!info || !pk) continue;
				accounts.push({
					pubkey: pk,
					data: info.data as Buffer,
					lamports: info.lamports,
					owner: info.owner,
					executable: info.executable,
					rentEpoch: info.rentEpoch,
				});
			}
		}
		let count = 0;
		for (const a of accounts) {
			try {
				context.svm.setAccount(a.pubkey, {
					data: new Uint8Array(a.data),
					executable: a.executable,
					lamports: Number(a.lamports),
					owner: a.owner,
					rentEpoch: 0,
				});
				count++;
			} catch {}
		}
		return context.createSuccessResponse(id, { ok: true, count });
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"Clone token accounts failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
