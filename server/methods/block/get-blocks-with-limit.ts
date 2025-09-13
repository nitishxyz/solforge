import type { RpcMethodHandler } from "../../types";

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

