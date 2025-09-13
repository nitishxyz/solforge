import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the getMultipleAccounts RPC method
 * @see https://docs.solana.com/api/http#getmultipleaccounts
 */
export const getMultipleAccounts: RpcMethodHandler = (id, params, context) => {
  const [pubkeys, config] = params;
  const encoding = config?.encoding || "base64";
  
  const accounts = pubkeys.map((pubkeyStr: string) => {
    try {
      const pubkey = new PublicKey(pubkeyStr);
      const account = context.svm.getAccount(pubkey);
      
      if (!account) {
        return null;
      }

      return {
        lamports: Number(account.lamports),
        owner: new PublicKey(account.owner).toBase58(),
        data: encoding === "base64"
          ? [Buffer.from(account.data).toString("base64"), encoding]
          : Array.from(account.data),
        executable: account.executable,
        rentEpoch: Number(account.rentEpoch || 0)
      };
    } catch {
      return null;
    }
  });

  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: accounts
  });
};