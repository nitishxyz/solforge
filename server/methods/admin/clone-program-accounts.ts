import { Connection, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const solforgeAdminCloneProgramAccounts: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [programId, options] = params as [
		string,
		{ endpoint?: string; limit?: number; filters?: unknown[] }?,
	];
	if (!programId)
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params: programId required",
		);
	const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
	const limit = options?.limit
		? Math.max(1, Math.min(10000, options.limit))
		: undefined;
	try {
		const conn = new Connection(endpoint, "confirmed");
		const pid = new PublicKey(programId);
		const list = await conn.getProgramAccounts(pid, {
			commitment: "confirmed",
			// @ts-expect-error: filters type is loose
			filters: Array.isArray(options?.filters) ? options?.filters : undefined,
		});
		let count = 0;
		for (const { pubkey, account } of list.slice(0, limit ?? list.length)) {
			try {
				context.svm.setAccount(pubkey, {
					data: new Uint8Array(account.data as Buffer),
					executable: account.executable,
					lamports: Number(account.lamports),
					owner: account.owner,
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
			"Clone program accounts failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
