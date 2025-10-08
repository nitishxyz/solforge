import type { RpcMethodHandler } from "../../types";

export const getLeaderSchedule: RpcMethodHandler = (id, _params, _context) => {
	const identity = "11111111111111111111111111111111";
	const schedule: Record<string, number[]> = {};
	schedule[identity] = Array.from({ length: 100 }, (_, i) => i);
	return { jsonrpc: "2.0", id, result: schedule };
};
