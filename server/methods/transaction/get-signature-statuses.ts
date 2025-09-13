import type { RpcMethodHandler } from "../../types";

export const getSignatureStatuses: RpcMethodHandler = (id, params, context) => {
  const [signatures] = params;

  const statuses = signatures.map((sig: string) => {
    try {
      // Prefer locally recorded transactions for reliability with CLI tooling
      const rec = context.getRecordedTransaction(sig);
      if (rec) {
        const errVal: any = rec.err ?? null;
        const status = errVal ? { Err: errVal } : { Ok: null };
        return {
          slot: rec.slot,
          confirmations: errVal ? 0 : 1,
          err: errVal,
          confirmationStatus: errVal ? "processed" : "confirmed",
          status
        };
      }

      const sigBytes = context.decodeBase58(sig);
      const tx = (context.svm as any).getTransaction(sigBytes);
      if (!tx) return null;

      let errVal: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errVal = ("err" in tx) ? (tx as any).err() : null;
      } catch { errVal = null; }
      const status = errVal ? { Err: errVal } : { Ok: null };

      return {
        slot: Number(context.slot),
        confirmations: errVal ? 0 : 1,
        err: errVal,
        confirmationStatus: errVal ? "processed" : "confirmed",
        status
      };
    } catch {
      return null;
    }
  });

  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: statuses
  });
};
