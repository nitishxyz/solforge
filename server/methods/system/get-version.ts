import type { RpcMethodHandler } from "../../types";

export const getVersion: RpcMethodHandler = (id, _params, _context) => {
	return {
		jsonrpc: "2.0",
		id,
		result: { "solana-core": "1.18.0", "feature-set": 1 },
	};
};
