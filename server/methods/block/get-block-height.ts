import type { RpcMethodHandler } from "../../types";

export const getBlockHeight: RpcMethodHandler = (id, _params, context) => {
	return context.createSuccessResponse(id, Number(context.blockHeight));
};
