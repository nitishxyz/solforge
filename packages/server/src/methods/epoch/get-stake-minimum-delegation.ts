import type { RpcMethodHandler } from "../../types";

export const getStakeMinimumDelegation: RpcMethodHandler = (
	id,
	_params,
	context,
) => {
	return context.createSuccessResponse(id, 1_000_000_000);
};
