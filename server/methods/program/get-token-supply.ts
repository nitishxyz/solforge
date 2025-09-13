import type { RpcMethodHandler } from "../../types";

export const getTokenSupply: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: { amount: "1000000000", decimals: 9, uiAmount: 1.0, uiAmountString: "1" }
  });
};

