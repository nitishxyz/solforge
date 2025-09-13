import type { RpcMethodHandler } from "../types";

export const getLatestBlockhash: RpcMethodHandler = (id, _params, context) => {
  const blockhash = context.svm.latestBlockhash();
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      blockhash,
      lastValidBlockHeight: Number(context.blockHeight + 150n)
    }
  });
};

export const getSlot: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, Number(context.slot));
};

export const getBlockHeight: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, Number(context.blockHeight));
};