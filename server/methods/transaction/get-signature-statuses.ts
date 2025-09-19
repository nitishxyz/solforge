import type { RpcMethodHandler } from "../../types";

export const getSignatureStatuses: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [signatures] = params;

	let persisted: Map<string, { slot: number; err: unknown | null }> = new Map();
	try {
		persisted = (await context.store?.getStatuses(signatures)) || new Map();
	} catch {}

	const statuses = signatures.map((sig: string) => {
		try {
			// Prefer locally recorded transactions for reliability with CLI tooling
			const rec = context.getRecordedTransaction(sig);
			if (rec) {
				const errVal: unknown = rec.err ?? null;
				const status = errVal ? { Err: errVal } : { Ok: null };
				return {
					slot: rec.slot,
					confirmations: errVal ? 0 : null,
					err: errVal,
					confirmationStatus: errVal ? "processed" : "finalized",
					status,
				};
			}
			const db = persisted.get(sig);
			if (db) {
				const errVal: unknown = db.err ?? null;
				const status = errVal ? { Err: errVal } : { Ok: null };
				return {
					slot: db.slot,
					confirmations: errVal ? 0 : null,
					err: errVal,
					confirmationStatus: errVal ? "processed" : "finalized",
					status,
				};
			}

			const sigBytes = context.decodeBase58(sig);
			const txGetter = (
				context.svm as unknown as {
					getTransaction?: (sig: Uint8Array) => { err?: unknown } | undefined;
				}
			).getTransaction;
			const tx =
				typeof txGetter === "function" ? txGetter(sigBytes) : undefined;
			if (!tx) return null;

			let errVal: unknown = null;
			try {
				const rawErr = (tx as { err?: unknown }).err;
				errVal =
					typeof rawErr === "function" ? (rawErr as () => unknown)() : rawErr;
			} catch {
				errVal = null;
			}
			const status = errVal ? { Err: errVal } : { Ok: null };

			return {
				slot: Number(context.slot),
				confirmations: errVal ? 0 : null,
				err: errVal,
				confirmationStatus: errVal ? "processed" : "finalized",
				status,
			};
		} catch {
			return null;
		}
	});

	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: statuses,
	});
};
