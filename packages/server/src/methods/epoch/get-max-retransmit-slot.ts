import type { RpcMethodHandler } from "../../types";

export const getMaxRetransmitSlot: RpcMethodHandler = (
	id,
	_params,
	context,
) => {
	return context.createSuccessResponse(id, Number(context.slot));
};
