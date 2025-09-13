import type { RpcMethodHandler } from "../types";

// Approximate Solana timing: ~400ms per slot => ~150 slots per 60s sample
const SLOTS_PER_60S_SAMPLE = 150;

export const getRecentPerformanceSamples: RpcMethodHandler = (id, params, context) => {
  const [limitRaw] = params || [];
  const limit = Math.max(1, Math.min(Number(limitRaw ?? 1), 720));

  const samples = Array.from({ length: limit }, (_v, i) => {
    const slot = Math.max(0, Number(context.slot) - i * SLOTS_PER_60S_SAMPLE);
    const numSlots = SLOTS_PER_60S_SAMPLE;
    // We do not have historical tx counts; provide a minimal, non-zero estimate
    // based on observed total tx count to avoid explorer errors.
    const totalTx = Number(context.getTxCount());
    const estPerSample = Math.max(0, Math.min(totalTx, 5000));
    return {
      numSlots,
      numTransactions: estPerSample,
      samplePeriodSecs: 60,
      slot
    };
  });

  return context.createSuccessResponse(id, samples);
};

export const getTransactionCount: RpcMethodHandler = (id, _params, context) => {
  // Return observed tx count; provide a floor of 0
  const count = Number(context.getTxCount());
  return context.createSuccessResponse(id, count);
};

