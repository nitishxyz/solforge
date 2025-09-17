import type { RpcMethodHandler } from "../../types";

export const getInflationRate: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, {
		epoch: 0,
		foundation: 0.05,
		total: 0.15,
		validator: 0.1,
	});
};
