import type { RpcMethodHandler } from "../../types";

export const getBlockTime: RpcMethodHandler = (id, params, context) => {
  const [slot] = params || [];
  if (Number(slot) > Number(context.slot)) {
    return context.createSuccessResponse(id, null);
  }
  const SLOT_TIME_MS = 400;
  const currentTime = Math.floor(Date.now() / 1000);
  const slotDiff = Number(context.slot) - Number(slot);
  const blockTime = currentTime - Math.floor(slotDiff * SLOT_TIME_MS / 1000);
  return context.createSuccessResponse(id, blockTime);
};

