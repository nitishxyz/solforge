import type { RpcMethodHandler } from "../../types";

export const getMinimumBalanceForRentExemption: RpcMethodHandler = (
	id,
	params,
	context,
) => {
	const [dataLength] = params || [];
	const minBalance = context.svm.minimumBalanceForRentExemption(
		BigInt(dataLength),
	);
	return context.createSuccessResponse(id, Number(minBalance));
};
