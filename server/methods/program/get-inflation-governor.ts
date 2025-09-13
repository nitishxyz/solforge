import type { RpcMethodHandler } from "../../types";

export const getInflationGovernor: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    foundation: 0.05,
    foundationTerm: 7,
    initial: 0.15,
    taper: 0.15,
    terminal: 0.015
  });
};

