import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the getAccountInfo RPC method
 * @see https://docs.solana.com/api/http#getaccountinfo
 */
export const getAccountInfo: RpcMethodHandler = (id, params, context) => {
  const [pubkeyStr, config] = params;
  const encoding = config?.encoding || "base64";
  
  try {
    const pubkey = new PublicKey(pubkeyStr);
    const account = context.svm.getAccount(pubkey);
    
    if (!account) {
      return context.createSuccessResponse(id, {
        context: { slot: Number(context.slot) },
        value: null
      });
    }

    const accountInfo = {
      lamports: Number(account.lamports),
      owner: new PublicKey(account.owner).toBase58(),
      data: encoding === "base64" 
        ? [Buffer.from(account.data).toString("base64"), encoding]
        : Array.from(account.data),
      executable: account.executable,
      rentEpoch: Number(account.rentEpoch || 0)
    };

    return context.createSuccessResponse(id, {
      context: { slot: Number(context.slot) },
      value: accountInfo
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};