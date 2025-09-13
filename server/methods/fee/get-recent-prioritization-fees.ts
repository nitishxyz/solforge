import type { RpcMethodHandler } from "../../types";

export const getRecentPrioritizationFees: RpcMethodHandler = (id, params, context) => {
  const addresses = params?.[0] || [];
  const fees =addresses.length>0
    ? addresses.map(() => ({ slot: Number(context.slot), prioritizationFee: 0 }))
    : Array(150).fill(null).map((_, i) => ({ slot: Math.max(0, Number(context.slot) - i), prioritizationFee: 0 }));
  return context.createSuccessResponse(id, fees);
};

