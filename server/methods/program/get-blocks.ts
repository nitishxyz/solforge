import type { RpcMethodHandler } from "../../types";

export const getBlocks: RpcMethodHandler = (id, params, context) => {
  const [startSlot, endSlot] = params || [];
  const start = Number(startSlot || 0);
  const end = Number(endSlot || context.slot);
  const blocks: number[] = [];
  for (let i = start; i <= end && i <= Number(context.slot); i++) blocks.push(i);
  return context.createSuccessResponse(id, blocks);
};

