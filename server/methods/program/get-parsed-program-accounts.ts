import type { RpcMethodHandler } from "../../types";

export const getParsedProgramAccounts: RpcMethodHandler = (id, _params, context) => {
  // Minimal implementation for compatibility
  return context.createSuccessResponse(id, []);
};

