import type { RpcMethodHandler } from "../../types";

export const getClusterNodes: RpcMethodHandler = (id, _params, _context) => {
  return { jsonrpc: "2.0", id, result: [
    { pubkey: "11111111111111111111111111111111", gossip: "127.0.0.1:8001", tpu: "127.0.0.1:8003", rpc: "127.0.0.1:8899", version: "1.17.0" }
  ] };
};

