import type { RpcMethodHandler } from "../../types";

export const solforgeListMints: RpcMethodHandler = async (
	id,
	_params,
	context,
) => {
	try {
		const list = context.listMints ? context.listMints() : [];
		return context.createSuccessResponse(id, list);
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"List mints failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
