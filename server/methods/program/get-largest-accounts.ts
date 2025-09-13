import type { RpcMethodHandler } from "../../types";

export const getLargestAccounts: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};

