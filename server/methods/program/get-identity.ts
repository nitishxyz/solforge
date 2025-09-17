import type { RpcMethodHandler } from "../../types";

export const getIdentity: RpcMethodHandler = (id, _params, _context) => {
	const IDENTITY_PUBKEY = "11111111111111111111111111111111";
	return { jsonrpc: "2.0", id, result: { identity: IDENTITY_PUBKEY } };
};
