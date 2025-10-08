import type { RpcMethodHandler } from "../../types";

export const getSupply: RpcMethodHandler = (id, _params, context) => {
	// 1,000,000 SOL = 1e15 lamports (matches SVM initialization)
	const totalLamports = 1_000_000_000_000_000;
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: {
			circulating: totalLamports,
			nonCirculating: 0,
			nonCirculatingAccounts: [],
			total: totalLamports,
		},
	});
};
