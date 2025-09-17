import {
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackAccount,
	unpackMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenLargestAccounts: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [mintStr] = params || [];
	try {
		const mint = new PublicKey(mintStr);
		const mintAcc = context.svm.getAccount(mint);
		const programPk =
			mintAcc && new PublicKey(mintAcc.owner).equals(TOKEN_2022_PROGRAM_ID)
				? TOKEN_2022_PROGRAM_ID
				: TOKEN_PROGRAM_ID;
		const mintInfo = mintAcc
			? unpackMint(
					mint,
					{
						data: Buffer.from(mintAcc.data),
						owner: new PublicKey(mintAcc.owner),
					},
					programPk,
				)
			: null;
		const decimals = mintInfo?.decimals ?? 0;
		// Scan DB list of SPL token accounts and pick those with this mint
		const rows =
			(await context.store?.getAccountsByOwner(
				TOKEN_PROGRAM_ID.toBase58(),
				50_000,
			)) || [];
		const list: Array<{ address: string; amount: bigint }> = [];
		for (const r of rows) {
			try {
				const acc = context.svm.getAccount(new PublicKey(r.address));
				if (!acc) continue;
				if ((acc.data?.length ?? 0) < 165) continue;
				const accOwnerPk = new PublicKey(acc.owner);
				const accProgramPk = accOwnerPk.equals(TOKEN_2022_PROGRAM_ID)
					? TOKEN_2022_PROGRAM_ID
					: TOKEN_PROGRAM_ID;
				const dec = unpackAccount(
					new PublicKey(r.address),
					{ data: Buffer.from(acc.data), owner: accOwnerPk },
					accProgramPk,
				);
				if (!dec.mint.equals(mint)) continue;
				const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
				list.push({ address: r.address, amount });
			} catch {}
		}
		list.sort((a, b) =>
			a.amount < b.amount ? 1 : a.amount > b.amount ? -1 : 0,
		);
		const top = list.slice(0, 20).map((e) => {
			const ui = Number(e.amount) / 10 ** decimals;
			return {
				address: e.address,
				amount: e.amount.toString(),
				decimals,
				uiAmount: ui,
				uiAmountString: ui.toString(),
			};
		});
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: top,
		});
	} catch (e: any) {
		return context.createErrorResponse(id, -32602, "Invalid params", e.message);
	}
};
