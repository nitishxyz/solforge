import { VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../types";

export const sendTransaction: RpcMethodHandler = (id, params, context) => {
  const [encodedTx] = params;
  
  try {
    const txData = Buffer.from(encodedTx, "base64");
    const tx = VersionedTransaction.deserialize(txData);
    
    const result = context.svm.sendTransaction(tx);
    
    if ("err" in result) {
      return context.createErrorResponse(
        id,
        -32002,
        "Transaction simulation failed",
        result.err
      );
    }

    const signature = tx.signatures[0] ? 
      context.encodeBase58(tx.signatures[0]) : 
      context.encodeBase58(new Uint8Array(64).fill(0));
    
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
    
    if (!tx) {
      return context.createSuccessResponse(id, null);
    }

    const isError = "err" in tx;
    const logs = isError ? tx.meta().logs() : tx.logs();
    
    return context.createSuccessResponse(id, {
      slot: Number(context.slot),
      transaction: {
        signatures: [signature]
      },
      meta: {
        err: isError ? tx.err() : null,
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

      return {
        slot: Number(context.slot),
        confirmations: 0,
        err: "err" in tx ? tx.err : null,
        confirmationStatus: "finalized"
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