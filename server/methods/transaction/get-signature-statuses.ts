import type { RpcMethodHandler } from "../../types";

export const getSignatureStatuses: RpcMethodHandler = (id, params, context) => {
  const [signatures] = params;

  const statuses = signatures.map((sig: string) => {
    try {
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
        confirmations: errVal ? 0 : null,
        err: errVal,
        confirmationStatus: errVal ? "processed" : "finalized",
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

