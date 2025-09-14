import type { RpcMethodHandler } from "../../types";
import { getProgramAccounts } from "./get-program-accounts";

export const getParsedProgramAccounts: RpcMethodHandler = (id, params, context) => {
  const [programId, config] = params || [];
  const cfg = { ...(config || {}), encoding: "jsonParsed" };
  return getProgramAccounts(id, [programId, cfg], context);
};
