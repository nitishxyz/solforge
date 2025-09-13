import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenAccountBalance: RpcMethodHandler = (id, params, context) => {
  const [pubkey] = params || [];
  try {
    const pubkeyBytes = context.decodeBase58(pubkey);
    // Validate account existence (if not present, return error like before)
    const account = context.svm.getAccount(new PublicKey(pubkeyBytes));
    if (!account) {
      return context.createErrorResponse(id, -32602, "Account not found");
    }
    return context.createSuccessResponse(id, {
      context: { slot: Number(context.slot) },
      value: { amount: "0", decimals: 9, uiAmount: 0.0, uiAmountString: "0" }
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

