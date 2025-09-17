import type { RpcMethodHandler } from "../../types";

export const getSlotLeader: RpcMethodHandler = (id, _params, _context) => {
	const LEADER_PUBKEY = "11111111111111111111111111111111";
	return { jsonrpc: "2.0", id, result: LEADER_PUBKEY };
};
