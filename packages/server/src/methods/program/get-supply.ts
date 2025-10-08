import type { RpcMethodHandler } from "../../types";

export const getSupply: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: {
			circulating: 1000000000000,
			nonCirculating: 0,
			nonCirculatingAccounts: [],
			total: 1000000000000,
		},
	});
};
