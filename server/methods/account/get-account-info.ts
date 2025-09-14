import { PublicKey } from "@solana/web3.js";
import { parseAccountJson } from "./parsers";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the getAccountInfo RPC method
 * @see https://docs.solana.com/api/http#getaccountinfo
 */
export const getAccountInfo: RpcMethodHandler = async (id, params, context) => {
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
    // Opportunistic index update
    try {
      await context.store?.upsertAccounts([{ 
        address: pubkey.toBase58(),
        lamports: Number(account.lamports || 0n),
        ownerProgram: owner,
        executable: !!account.executable,
        rentEpoch: Number(account.rentEpoch || 0),
        dataLen: account.data?.length ?? 0,
        dataBase64: undefined,
        lastSlot: Number(context.slot)
      }]);
    } catch {}

    if (encoding === "jsonParsed") {
      const parsed = parseAccountJson(pubkey, {
        owner: new PublicKey(account.owner),
        data: account.data ? new Uint8Array(account.data) : new Uint8Array(),
        lamports: account.lamports,
        executable: account.executable,
        rentEpoch: account.rentEpoch
      }, context);

      return context.createSuccessResponse(id, {
        context: { slot: Number(context.slot) },
        value: {
          lamports: Number(account.lamports),
          owner,
          executable: account.executable,
          rentEpoch: Number(account.rentEpoch || 0),
          data: parsed || { program: "unknown", parsed: null, space: account.data?.length ?? 0 }
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
