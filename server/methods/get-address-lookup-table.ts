import type { RpcMethodHandler } from "../types";

export const getAddressLookupTable: RpcMethodHandler = (
	id,
	params,
	context,
) => {
	try {
		const [arg] = params || [];
		const address: string =
			typeof arg === "string" ? arg : arg?.accountKey || arg?.address;
		if (!address || typeof address !== "string") {
			throw new Error("Missing address");
		}
		const bytes = context.decodeBase58(address);
		if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
			throw new Error("Invalid address length");
		}
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: null,
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
