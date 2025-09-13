import type { RpcMethodHandler } from "../../types";

export const getVoteAccounts: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    current: [
      {
        votePubkey: "11111111111111111111111111111111",
        nodePubkey: "11111111111111111111111111111111",
        activatedStake: 1000000000,
        epochVoteAccount: true,
        commission: 0,
        lastVote: Number(context.slot),
        epochCredits: [[0, 1000, 0]],
        rootSlot: Number(context.slot) - 1
      }
    ],
    delinquent: []
  });
};

