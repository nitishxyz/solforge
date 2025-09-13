import type { RpcMethodHandler } from "../../types";

export const getTokenAccountsByDelegate: RpcMethodHandler = (id, params, context) => {
  const [_delegate, _filter] = params || [];
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};

