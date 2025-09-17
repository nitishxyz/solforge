import type { RpcMethodHandler } from "../../types";

export const getFeeForMessage: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot), apiVersion: "1.17.9" },
		value: 5000,
	});
};
