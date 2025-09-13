import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the requestAirdrop RPC method
 * @see https://docs.solana.com/api/http#requestairdrop
 */
export const requestAirdrop: RpcMethodHandler = (id, params, context) => {
  const [pubkeyStr, lamports] = params;
  
  try {
    const pubkey = new PublicKey(pubkeyStr);
    const result = context.svm.airdrop(pubkey, BigInt(lamports));
    
    if (!result || "err" in result) {
      return context.createErrorResponse(
        id,
        -32003,
        "Airdrop failed",
        result?.err || "Unknown error"
      );
    }

    // Generate a mock signature for the airdrop transaction
    const signature = context.encodeBase58(new Uint8Array(64).fill(1));
    
    return context.createSuccessResponse(id, signature);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};