import type { RpcMethodHandler } from "../../types";

export const getMaxShredInsertSlot: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, Number(context.slot));
};

