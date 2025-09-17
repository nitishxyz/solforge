import type { RpcMethodHandler } from "../../types";

export const getBlock: RpcMethodHandler = (id, params, context) => {
	try {
		const [slotRaw] = params || [];
		const slot = Number(slotRaw);
		if (!Number.isFinite(slot) || slot < 0) throw new Error("Invalid slot");
		const parentSlot = Math.max(0, slot - 1);
		const blockhash = context.svm.latestBlockhash();
		const previousBlockhash = context.svm.latestBlockhash();
		const SLOT_TIME_MS = 400;
		const currentTime = Math.floor(Date.now() / 1000);
		const slotDiff = Number(context.slot) - slot;
		const blockTime =
			slot > Number(context.slot)
				? null
				: currentTime -
					Math.floor((Math.max(0, slotDiff) * SLOT_TIME_MS) / 1000);
		return context.createSuccessResponse(id, {
			blockhash,
			previousBlockhash,
			parentSlot,
			transactions: [],
			rewards: [],
			blockTime,
		});
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params",
			error.message,
		);
	}
};
