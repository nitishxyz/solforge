import type { RpcMethodHandler } from "../../types";
import { PublicKey } from "@solana/web3.js";

export const getSignaturesForAddress: RpcMethodHandler = async (id, params, context) => {
  try {
    const [address, config] = params || [];
    if (typeof address !== "string") throw new Error("Invalid address");
    // Validate pubkey
    new PublicKey(address);
    const limit = Math.max(1, Math.min(Number(config?.limit ?? 1000), 1000));
    const before = typeof config?.before === "string" ? config.before : undefined;
    const until = typeof config?.until === "string" ? config.until : undefined;

    if (!context.store) return context.createSuccessResponse(id, []);
    const entries = await context.store.getSignaturesForAddress(address, { before, until, limit });
    return context.createSuccessResponse(id, entries);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
