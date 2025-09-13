import type { RpcMethodHandler } from "../../types";

export const getEpochInfo: RpcMethodHandler = (id, _params, context) => {
  const slotsPerEpoch = 432000;
  const currentSlot = Number(context.slot);
  const epoch = Math.floor(currentSlot / slotsPerEpoch);
  const slotIndex = currentSlot % slotsPerEpoch;
  return context.createSuccessResponse(id, {
    absoluteSlot: currentSlot,
    blockHeight: currentSlot,
    epoch,
    slotIndex,
    slotsInEpoch: slotsPerEpoch,
    transactionCount: currentSlot * 100
  });
};

