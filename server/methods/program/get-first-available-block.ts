import type { RpcMethodHandler } from "../../types";

export const getFirstAvailableBlock: RpcMethodHandler = (id, _params, _context) => {
  return { jsonrpc: "2.0", id, result: 0 };
};

