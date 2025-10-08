import type { RpcMethodHandler } from "../../types";

export const getSlotLeaders: RpcMethodHandler = (id, params, _context) => {
	const [_startSlot, limit] = params || [];
	const LEADER_PUBKEY = "11111111111111111111111111111111";
	const count = Math.min(Number(limit || 100), 5000);
	const leaders = Array(count).fill(LEADER_PUBKEY);
	return { jsonrpc: "2.0", id, result: leaders };
};
