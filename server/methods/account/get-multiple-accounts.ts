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

      const owner = new PublicKey(account.owner).toBase58();
      if (encoding === "jsonParsed") {
        const program = owner === "11111111111111111111111111111111" ? "system" : "unknown";
        const space = account.data?.length ?? 0;
        return {
          lamports: Number(account.lamports),
          owner,
          executable: account.executable,
          rentEpoch: Number(account.rentEpoch || 0),
          data: {
            program,
            parsed: program === "system" ? { type: "account", info: {} } : null,
            space
          }
        };
      }

      return {
        lamports: Number(account.lamports),
        owner,
        data: [Buffer.from(account.data).toString("base64"), "base64"] as const,
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
