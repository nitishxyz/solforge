import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the getBalance RPC method
 * @see https://docs.solana.com/api/http#getbalance
 */
export const getBalance: RpcMethodHandler = (id, params, context) => {
	const [pubkeyStr] = params;

	try {
		const pubkey = new PublicKey(pubkeyStr);
		const balance = context.svm.getBalance(pubkey);

		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: Number(balance || 0n),
		});
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params",
			error.message,
		);
	}
};
