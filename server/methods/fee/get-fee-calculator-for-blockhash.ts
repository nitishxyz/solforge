import type { RpcMethodHandler } from "../../types";

export const getFeeCalculatorForBlockhash: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, { context: { slot: Number(context.slot) }, value: { feeCalculator: { lamportsPerSignature: 5000 } } });
};

