import type { RpcMethodHandler } from "../../types";
import { getAccountInfo } from "./get-account-info";

export const getParsedAccountInfo: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [pubkey, config] = params || [];
	const cfg = { ...(config || {}), encoding: "jsonParsed" };
	try {
		return await getAccountInfo(id, [pubkey, cfg], context);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(id, -32603, "Internal error", message);
	}
};
