import type { RpcMethodHandler } from "../../types";

export const isBlockhashValid: RpcMethodHandler = (id, params, context) => {
	try {
		const [blockhash] = params || [];
		const current = context.svm.latestBlockhash();
		const isValid =
			typeof blockhash === "string" &&
			blockhash.length > 0 &&
			blockhash === current;
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: isValid,
		});
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params",
			error.message,
		);
	}
};
