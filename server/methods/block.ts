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

export const getBlock: RpcMethodHandler = (id, params, context) => {
  try {
    const [slotRaw, _config] = params || [];
    const slot = Number(slotRaw);
    if (!Number.isFinite(slot) || slot < 0) {
      throw new Error("Invalid slot");
    }
    const parentSlot = Math.max(0, slot - 1);
    const blockhash = context.svm.latestBlockhash();
    const previousBlockhash = context.svm.latestBlockhash();
    const SLOT_TIME_MS = 400;
    const currentTime = Math.floor(Date.now() / 1000);
    const slotDiff = Number(context.slot) - slot;
    const blockTime = slot > Number(context.slot)
      ? null
      : currentTime - Math.floor(Math.max(0, slotDiff) * SLOT_TIME_MS / 1000);

    return context.createSuccessResponse(id, {
      blockhash,
      previousBlockhash,
      parentSlot,
      transactions: [],
      rewards: [],
      blockTime
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

export const getBlocksWithLimit: RpcMethodHandler = (id, params, context) => {
  try {
    const [startSlotRaw, limitRaw] = params || [];
    const start = Number(startSlotRaw);
    const limit = Number(limitRaw);
    if (!Number.isFinite(start) || start < 0) throw new Error("Invalid start slot");
    if (!Number.isFinite(limit) || limit <= 0) throw new Error("Invalid limit");
    const end = Math.min(Number(context.slot), start + limit - 1);
    const blocks: number[] = [];
    for (let s = start; s <= end; s++) blocks.push(s);
    return context.createSuccessResponse(id, blocks);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
