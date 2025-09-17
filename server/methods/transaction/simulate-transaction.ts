import { VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const simulateTransaction: RpcMethodHandler = (id, params, context) => {
	const [encodedTx] = params;
	try {
		const txData = Buffer.from(encodedTx, "base64");
		const tx = VersionedTransaction.deserialize(txData);
		const result = context.svm.simulateTransaction(tx);

		if ("err" in result) {
			const errorMeta = result.meta();
			// To maximize client compatibility, report err as null and return logs
			// (Some clients fail to deserialize unknown enum variants or numeric codes.)
			return context.createSuccessResponse(id, {
				context: { slot: Number(context.slot) },
				value: {
					err: null,
					logs: errorMeta.logs(),
					accounts: null,
					unitsConsumed: Number(errorMeta.computeUnitsConsumed()),
					returnData: null,
				},
			});
		}

		const meta = result.meta();
		const returnData = meta.returnData();

		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: {
				err: null,
				logs: meta.logs(),
				accounts: null,
				unitsConsumed: Number(meta.computeUnitsConsumed()),
				returnData: returnData
					? {
							programId: context.encodeBase58(returnData.programId()),
							data: [
								Buffer.from(returnData.data()).toString("base64"),
								"base64",
							],
						}
					: null,
			},
		});
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32003,
			"Simulation failed",
			error.message,
		);
	}
};
