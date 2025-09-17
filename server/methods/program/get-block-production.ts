import type { RpcMethodHandler } from "../../types";

export const getBlockProduction: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: {
			byIdentity: {},
			range: {
				firstSlot: 0,
				lastSlot: Number(context.slot),
			},
		},
	});
};
