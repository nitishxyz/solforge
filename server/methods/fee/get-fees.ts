import type { RpcMethodHandler } from "../../types";

export const getFees: RpcMethodHandler = (id, _params, context) => {
	const blockhash = context.svm.latestBlockhash();
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: {
			blockhash,
			feeCalculator: { lamportsPerSignature: 5000 },
			lastValidSlot: Number(context.slot) + 150,
			lastValidBlockHeight: Number(context.slot) + 150,
		},
	});
};
