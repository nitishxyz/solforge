import type { RpcMethodHandler } from "../../types";

const SLOTS_PER_60S_SAMPLE = 150;

export const getRecentPerformanceSamples: RpcMethodHandler = (
	id,
	params,
	context,
) => {
	const [limitRaw] = params || [];
	const limit = Math.max(1, Math.min(Number(limitRaw ?? 1), 720));
	const samples = Array.from({ length: limit }, (_v, i) => {
		const slot = Math.max(0, Number(context.slot) - i * SLOTS_PER_60S_SAMPLE);
		const numSlots = SLOTS_PER_60S_SAMPLE;
		const totalTx = Number(context.getTxCount());
		const estPerSample = Math.max(0, Math.min(totalTx, 5000));
		return {
			numSlots,
			numTransactions: estPerSample,
			samplePeriodSecs: 60,
			slot,
		};
	});
	return context.createSuccessResponse(id, samples);
};
