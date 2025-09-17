import type { RpcMethodHandler } from "../../types";
import { getTransaction } from "./get-transaction";

export const getParsedTransaction: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [signature, config] = params || [];
	const cfg = { ...(config || {}), encoding: "jsonParsed" };
	try {
		return await getTransaction(id, [signature, cfg], context);
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32603,
			"Internal error",
			error.message,
		);
	}
};
