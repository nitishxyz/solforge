import type { RpcMethodHandler } from "../../types";
import { getTokenAccountsByDelegate } from "./get-token-accounts-by-delegate";

export const getParsedTokenAccountsByDelegate: RpcMethodHandler = (
	id,
	params,
	context,
) => {
	const [delegate, filter, config] = params || [];
	const cfg = { ...(config || {}), encoding: "jsonParsed" };
	return getTokenAccountsByDelegate(id, [delegate, filter, cfg], context);
};
