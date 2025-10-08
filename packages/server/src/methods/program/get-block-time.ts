import type { RpcMethodHandler } from "../../types";

export const getBlockTime: RpcMethodHandler = async (id, params, context) => {
	const [slot] = params || [];
	// Prefer persisted time if available
	try {
		const fromDb = await context.store?.getBlockTimeForSlot(Number(slot));
		if (typeof fromDb === "number") {
			return context.createSuccessResponse(id, fromDb);
		}
	} catch {}

	if (Number(slot) > Number(context.slot)) {
		return context.createSuccessResponse(id, null);
	}
	const SLOT_TIME_MS = 400;
	const currentTime = Math.floor(Date.now() / 1000);
	const slotDiff = Number(context.slot) - Number(slot);
	const blockTime = currentTime - Math.floor((slotDiff * SLOT_TIME_MS) / 1000);
	return context.createSuccessResponse(id, blockTime);
};
