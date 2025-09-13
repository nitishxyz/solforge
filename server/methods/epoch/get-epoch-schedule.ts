import type { RpcMethodHandler } from "../../types";

export const getEpochSchedule: RpcMethodHandler = (id, _params, _context) => {
  return { jsonrpc: "2.0", id, result: { slotsPerEpoch: 432000, leaderScheduleSlotOffset: 432000, warmup: false, firstNormalEpoch: 0, firstNormalSlot: 0 } };
};

