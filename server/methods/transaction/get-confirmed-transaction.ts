import type { RpcMethodHandler } from "../../types";
import { getTransaction } from "./get-transaction";

export const getConfirmedTransaction: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	// Alias to getTransaction for older clients
	return getTransaction(id, params, context);
};
