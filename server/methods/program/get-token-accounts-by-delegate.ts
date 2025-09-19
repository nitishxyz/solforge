import {
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenAccountsByDelegate: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [delegateStr, filter, config] = params || [];
	try {
		const delegate = new PublicKey(delegateStr);
		const requestedProgramId: string | null = filter?.programId
			? String(filter.programId)
			: null;
		const classicId = TOKEN_PROGRAM_ID.toBase58();
		const token2022Id = TOKEN_2022_PROGRAM_ID.toBase58();
		const programFilter =
			requestedProgramId === token2022Id ? token2022Id : classicId;
		const rows =
			(await context.store?.getAccountsByOwner(programFilter, 50_000)) || [];
		const out: unknown[] = [];
		for (const r of rows) {
			try {
				const acc = context.svm.getAccount(new PublicKey(r.address));
				if (!acc) continue;
				if ((acc.data?.length ?? 0) < 165) continue;
				const programPk =
					programFilter === token2022Id
						? TOKEN_2022_PROGRAM_ID
						: TOKEN_PROGRAM_ID;
				const dec = unpackAccount(
					new PublicKey(r.address),
					{ data: Buffer.from(acc.data), owner: new PublicKey(acc.owner) },
					programPk,
				);
				if (!dec.delegate || !dec.delegate.equals(delegate)) continue;
				if ((config?.encoding || "jsonParsed") === "jsonParsed") {
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: TOKEN_PROGRAM_ID.toBase58(),
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: {
								program: "spl-token",
								parsed: { type: "account", info: {} },
								space: data.length,
							},
						},
					});
				} else {
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: TOKEN_PROGRAM_ID.toBase58(),
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: [
								Buffer.from(acc.data).toString("base64"),
								"base64",
							] as const,
						},
					});
				}
			} catch {}
		}
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: out,
		});
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
