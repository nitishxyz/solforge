import type { RpcMethodHandler } from "../../types";
import { getTokenAccountsByOwner } from "./get-token-accounts-by-owner";

export const getParsedTokenAccountsByOwner: RpcMethodHandler = (id, params, context) => {
  const [owner, filter, config] = params || [];
  const cfg = { ...(config || {}), encoding: "jsonParsed" };
  return getTokenAccountsByOwner(id, [owner, filter, cfg], context);
};

