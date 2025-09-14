import { VersionedTransaction, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const sendTransaction: RpcMethodHandler = (id, params, context) => {
  const [encodedTx] = params;
  try {
    const txData = Buffer.from(encodedTx, "base64");
    const tx = VersionedTransaction.deserialize(txData);

    // Snapshot pre balances
    const msg: any = tx.message as any;
    const rawKeys: any[] = Array.isArray(msg.staticAccountKeys)
      ? msg.staticAccountKeys
      : (Array.isArray(msg.accountKeys) ? msg.accountKeys : []);
    const staticKeys = rawKeys.map((k: any) => {
      try { return typeof k === "string" ? new PublicKey(k) : (k as PublicKey); } catch { return undefined; }
    }).filter(Boolean) as PublicKey[];
    const preBalances = staticKeys.map((pk) => {
      try { return Number(context.svm.getBalance(pk)); } catch { return 0; }
    });

    const result = context.svm.sendTransaction(tx);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeErr = (result as any).err?.();
      if (maybeErr) {
        return context.createErrorResponse(id, -32003, "Transaction failed", maybeErr);
      }
    } catch {}

    const signature = tx.signatures[0]
      ? context.encodeBase58(tx.signatures[0])
      : context.encodeBase58(new Uint8Array(64).fill(0));
    context.notifySignature(signature);
    // Snapshot post balances and capture logs for rich view
    const postBalances = staticKeys.map((pk) => {
      try { return Number(context.svm.getBalance(pk)); } catch { return 0; }
    });
    let logs: string[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyRes: any = result;
      if (typeof anyRes?.logs === "function") logs = anyRes.logs();
      else if (typeof anyRes?.meta === "function") logs = anyRes.meta()?.logs?.() ?? [];
    } catch {}
    context.recordTransaction(signature, tx, {
      logs,
      fee: 5000,
      blockTime: Math.floor(Date.now() / 1000),
      preBalances,
      postBalances
    });

    return context.createSuccessResponse(id, signature);
  } catch (error: any) {
    return context.createErrorResponse(id, -32003, "Transaction failed", error.message);
  }
};
