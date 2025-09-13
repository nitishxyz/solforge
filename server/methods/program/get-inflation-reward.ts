import type { RpcMethodHandler } from "../../types";

export const getInflationReward: RpcMethodHandler = (id, params, context) => {
  const [addresses] = params || [[]];
  const rewards = (addresses || []).map(() => ({
    amount: 0,
    effectiveSlot: Number(context.slot),
    epoch: 0,
    postBalance: 1000000000
  }));
  return context.createSuccessResponse(id, rewards);
};

