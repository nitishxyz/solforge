import {
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackAccount,
	unpackMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenAccountBalance: RpcMethodHandler = (
	id,
	params,
	context,
) => {
	const [pubkey] = params || [];
	try {
		const pubkeyBytes = context.decodeBase58(pubkey);
		const address = new PublicKey(pubkeyBytes);
		const account = context.svm.getAccount(address);
		if (!account)
			return context.createErrorResponse(id, -32602, "Account not found");
		const ownerPk = new PublicKey(account.owner);
		const programPk = ownerPk.equals(TOKEN_2022_PROGRAM_ID)
			? TOKEN_2022_PROGRAM_ID
			: TOKEN_PROGRAM_ID;
		const decoded = unpackAccount(
			address,
			{ data: Buffer.from(account.data), owner: ownerPk },
			programPk,
		);
		const mintAcc = context.svm.getAccount(decoded.mint);
		const mintInfo = mintAcc
			? unpackMint(
					decoded.mint,
					{
						data: Buffer.from(mintAcc.data),
						owner: new PublicKey(mintAcc.owner),
					},
					new PublicKey(mintAcc.owner).equals(TOKEN_2022_PROGRAM_ID)
						? TOKEN_2022_PROGRAM_ID
						: TOKEN_PROGRAM_ID,
				)
			: null;
		const decimals = mintInfo?.decimals ?? 0;
		const amount = BigInt(decoded.amount?.toString?.() ?? decoded.amount ?? 0);
		const ui = Number(amount) / 10 ** decimals;
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: {
				amount: amount.toString(),
				decimals,
				uiAmount: ui,
				uiAmountString: ui.toString(),
			},
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
