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

export const isBlockhashValid: RpcMethodHandler = (id, params, context) => {
  try {
    const [blockhash] = params || [];
    const current = context.svm.latestBlockhash();

    // Simple validity check: match current blockhash.
    // Good enough for local dev + CLI airdrop flow.
    const isValid = typeof blockhash === "string" && blockhash.length > 0 && blockhash === current;

    return context.createSuccessResponse(id, {
      context: { slot: Number(context.slot) },
      value: isValid
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
