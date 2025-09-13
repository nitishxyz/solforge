import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getProgramAccounts: RpcMethodHandler = (id, params, context) => {
  const [programId, _config] = params;
  try {
    // Validate input
    // eslint-disable-next-line no-new
    new PublicKey(programId);
    // LiteSVM lacks a scan API; return empty for compatibility
    return context.createSuccessResponse(id, []);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

