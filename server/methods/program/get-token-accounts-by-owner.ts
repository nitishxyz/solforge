import type { RpcMethodHandler } from "../../types";

export const getTokenAccountsByOwner: RpcMethodHandler = (id, params, context) => {
  const [_owner, _filter] = params || [];
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};

