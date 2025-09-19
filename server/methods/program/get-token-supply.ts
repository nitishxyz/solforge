import {
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenSupply: RpcMethodHandler = (id, params, context) => {
	const [mintStr] = params || [];
	try {
		const mint = new PublicKey(mintStr);
		const acc = context.svm.getAccount(mint);
		if (!acc) return context.createErrorResponse(id, -32602, "Mint not found");
		const ownerPk = new PublicKey(acc.owner);
		const programPk = ownerPk.equals(TOKEN_2022_PROGRAM_ID)
			? TOKEN_2022_PROGRAM_ID
			: TOKEN_PROGRAM_ID;
		const info = unpackMint(
			mint,
			{ data: Buffer.from(acc.data), owner: ownerPk },
			programPk,
		);
		const supply = BigInt(info.supply?.toString?.() ?? info.supply ?? 0);
		const ui = Number(supply) / 10 ** info.decimals;
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: {
				amount: supply.toString(),
				decimals: info.decimals,
				uiAmount: ui,
				uiAmountString: ui.toString(),
			},
		});
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
