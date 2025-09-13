import { VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../types";

export const sendTransaction: RpcMethodHandler = (id, params, context) => {
  const [encodedTx] = params;
  
  try {
    const txData = Buffer.from(encodedTx, "base64");
    const tx = VersionedTransaction.deserialize(txData);
    
    const result = context.svm.sendTransaction(tx);
    
    try {
      // If result exposes an err() method and it's non-null, treat as failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeErr = (result as any).err?.();
      if (maybeErr) {
        return context.createErrorResponse(id, -32003, "Transaction failed", maybeErr);
      }
    } catch {}

    const signature = tx.signatures[0] ? 
      context.encodeBase58(tx.signatures[0]) : 
      context.encodeBase58(new Uint8Array(64).fill(0));
    context.notifySignature(signature);
    
    return context.createSuccessResponse(id, signature);
  } catch (error: any) {
    return context.createErrorResponse(
      id,
      -32003,
      "Transaction failed",
      error.message
    );
  }
};

export const simulateTransaction: RpcMethodHandler = (id, params, context) => {
  const [encodedTx] = params;
  
  try {
    const txData = Buffer.from(encodedTx, "base64");
    const tx = VersionedTransaction.deserialize(txData);
    
    const result = context.svm.simulateTransaction(tx);
    
    if ("err" in result) {
      const errorMeta = result.meta();
      return context.createSuccessResponse(id, {
        context: { slot: Number(context.slot) },
        value: {
          err: result.err(),
          logs: errorMeta.logs(),
          accounts: null,
          unitsConsumed: Number(errorMeta.computeUnitsConsumed()),
          returnData: null
        }
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
        returnData: returnData ? {
          programId: context.encodeBase58(returnData.programId()),
          data: [Buffer.from(returnData.data()).toString("base64"), "base64"]
        } : null
      }
    });
  } catch (error: any) {
    return context.createErrorResponse(
      id,
      -32003,
      "Simulation failed",
      error.message
    );
  }
};

export const getTransaction: RpcMethodHandler = (id, params, context) => {
  const [signature] = params;
  
  try {
    const sigBytes = context.decodeBase58(signature);
    const tx = context.svm.getTransaction(sigBytes);
    
    if (!tx) return context.createSuccessResponse(id, null);

    const isError = "err" in tx;
    const logs = isError ? tx.meta().logs() : tx.logs();
    const errVal = isError ? tx.err() : null;
    const status = isError ? { Err: errVal } : { Ok: null };
    
    return context.createSuccessResponse(id, {
      slot: Number(context.slot),
      transaction: {
        signatures: [signature]
      },
      meta: {
        status,
        err: errVal,
        fee: 5000,
        preBalances: [],
        postBalances: [],
        innerInstructions: [],
        logMessages: logs,
        preTokenBalances: [],
        postTokenBalances: [],
        rewards: []
      }
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

export const getSignatureStatuses: RpcMethodHandler = (id, params, context) => {
  const [signatures] = params;
  
  const statuses = signatures.map((sig: string) => {
    try {
      const sigBytes = context.decodeBase58(sig);
      const tx = context.svm.getTransaction(sigBytes);
      
      if (!tx) {
        return null;
      }

      let errVal: any = null;
      try {
        // Some tx types expose err() when failed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errVal = ("err" in tx) ? (tx as any).err() : null;
      } catch {
        errVal = null;
      }
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
