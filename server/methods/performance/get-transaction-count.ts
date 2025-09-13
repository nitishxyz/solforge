import type { RpcMethodHandler } from "../../types";

export const getTransactionCount: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, Number(context.getTxCount()));
};

