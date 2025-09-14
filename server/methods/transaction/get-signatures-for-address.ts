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
    try {
      const entries = await context.store.getSignaturesForAddress(address, { before, until, limit });
      return context.createSuccessResponse(id, entries);
    } catch (e) {
      try { console.warn("[rpc] getSignaturesForAddress: db read failed", e); } catch {}
      // Graceful fallback: return empty list instead of error
      return context.createSuccessResponse(id, []);
    }
  } catch (error: any) {
    try { console.error("[rpc] getSignaturesForAddress error", error); } catch {}
    return context.createErrorResponse(id, -32603, "Internal error", error.message);
  }
};
