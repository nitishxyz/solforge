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

    const owner = new PublicKey(account.owner).toBase58();

    if (encoding === "jsonParsed") {
      const space = account.data?.length ?? 0;
      const program = owner === "11111111111111111111111111111111" ? "system" : "unknown";
      return context.createSuccessResponse(id, {
        context: { slot: Number(context.slot) },
        value: {
          lamports: Number(account.lamports),
          owner,
          executable: account.executable,
          rentEpoch: Number(account.rentEpoch || 0),
          data: {
            program,
            parsed: program === "system" ? { type: "account", info: {} } : null,
            space
          }
        }
      });
    }

    const accountInfo = {
      lamports: Number(account.lamports),
      owner,
      data: [Buffer.from(account.data).toString("base64"), "base64"] as const,
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
