import type { RpcMethodHandler } from "../../types";
import { PublicKey } from "@solana/web3.js";

// Minimal compatibility implementation: returns an empty list while validating params.
// Future: index recorded transactions by address inside RpcServer context.
export const getSignaturesForAddress: RpcMethodHandler = (id, params, context) => {
  try {
    const [address, config] = params || [];
    const _limit = Math.max(1, Math.min(Number(config?.limit ?? 1000), 1000));
    const _before = config?.before;
    const _until = config?.until;
    // Validate address formats
    if (typeof address !== "string") throw new Error("Invalid address");
    // Validate it parses as a public key
    new PublicKey(address);

    // Return empty list for now (no index of signatures by address)
    return context.createSuccessResponse(id, []);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

