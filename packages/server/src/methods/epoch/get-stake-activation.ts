import type { RpcMethodHandler } from "../../types";

export const getStakeActivation: RpcMethodHandler = (id, _params, _context) => {
	return {
		jsonrpc: "2.0",
		id,
		result: { state: "active", active: 1000000000, inactive: 0 },
	};
};
