import type { RpcMethodHandler } from "../../types";

export const getHighestSnapshotSlot: RpcMethodHandler = (id, _params, _context) => {
  return { jsonrpc: "2.0", id, result: { full: 0, incremental: null } };
};

