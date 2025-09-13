import type { RpcMethodHandler } from "../../types";

export const getTokenLargestAccounts: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};

