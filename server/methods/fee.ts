import type { RpcMethodHandler } from "../types";

export const getRecentPrioritizationFees: RpcMethodHandler = (id, params, context) => {
  const addresses = params?.[0] || [];
  
  const fees = addresses.length > 0 ? addresses.map(() => ({
    slot: Number(context.slot),
    prioritizationFee: 0
  })) : Array(150).fill(null).map((_, i) => ({
    slot: Math.max(0, Number(context.slot) - i),
    prioritizationFee: 0
  }));

  return context.createSuccessResponse(id, fees);
};

export const getFeeForMessage: RpcMethodHandler = (id, params, context) => {
  const [_encodedMessage, _config] = params;
  
  return context.createSuccessResponse(id, {
    context: { 
      slot: Number(context.slot),
      apiVersion: "1.17.9"
    },
    value: 5000
  });
};


export const getFees: RpcMethodHandler = (id, _params, context) => {
  const blockhash = context.svm.latestBlockhash();
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      blockhash,
      feeCalculator: {
        lamportsPerSignature: 5000
      },
      lastValidSlot: Number(context.slot) + 150,
      lastValidBlockHeight: Number(context.slot) + 150
    }
  });
};

export const getFeeCalculatorForBlockhash: RpcMethodHandler = (id, params, context) => {
  const [_blockhash] = params;
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      feeCalculator: {
        lamportsPerSignature: 5000
      }
    }
  });
};

export const getFeeRateGovernor: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      feeRateGovernor: {
        burnPercent: 50,
        maxLamportsPerSignature: 100000,
        minLamportsPerSignature: 5000,
        targetLamportsPerSignature: 10000,
        targetSignaturesPerSlot: 20000
      }
    }
  });
};