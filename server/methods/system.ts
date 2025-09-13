import type { RpcMethodHandler } from "../types";

export const getMinimumBalanceForRentExemption: RpcMethodHandler = (id, params, context) => {
  const [dataLength] = params;
  const minBalance = context.svm.minimumBalanceForRentExemption(BigInt(dataLength));
  
  return context.createSuccessResponse(id, Number(minBalance));
};

export const getHealth: RpcMethodHandler = (id, _params, _context) => {
  return {
    jsonrpc: "2.0",
    id,
    result: "ok"
  };
};

export const getVersion: RpcMethodHandler = (id, _params, _context) => {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      "solana-core": "1.18.0",
      "feature-set": 1
    }
  };
};