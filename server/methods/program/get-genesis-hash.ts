import type { RpcMethodHandler } from "../../types";

export const getGenesisHash: RpcMethodHandler = (id, _params, _context) => {
  const GENESIS_HASH = "11111111111111111111111111111111";
  return { jsonrpc: "2.0", id, result: GENESIS_HASH };
};

