import type { RpcMethodHandler } from "../../types";

export const getBlockCommitment: RpcMethodHandler = (id, params, context) => {
	const [_slot] = params || [];
	return context.createSuccessResponse(id, {
		commitment: [Number(context.slot), 0],
		totalStake: 1000000000,
	});
};
