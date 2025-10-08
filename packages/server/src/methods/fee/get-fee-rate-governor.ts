import type { RpcMethodHandler } from "../../types";

export const getFeeRateGovernor: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: {
			feeRateGovernor: {
				burnPercent: 50,
				maxLamportsPerSignature: 100000,
				minLamportsPerSignature: 5000,
				targetLamportsPerSignature: 10000,
				targetSignaturesPerSlot: 20000,
			},
		},
	});
};
