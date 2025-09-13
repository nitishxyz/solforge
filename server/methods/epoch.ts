import type { RpcMethodHandler } from "../types";

export const getEpochSchedule: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    slotsPerEpoch: 432000,
    leaderScheduleSlotOffset: 432000,
    warmup: false,
    firstNormalEpoch: 0,
    firstNormalSlot: 0
  });
};

export const getEpochInfo: RpcMethodHandler = (id, _params, context) => {
  const slotsPerEpoch = 432000;
  const currentSlot = Number(context.slot);
  const epoch = Math.floor(currentSlot / slotsPerEpoch);
  const slotIndex = currentSlot % slotsPerEpoch;
  
  return context.createSuccessResponse(id, {
    absoluteSlot: currentSlot,
    blockHeight: currentSlot,
    epoch,
    slotIndex,
    slotsInEpoch: slotsPerEpoch,
    transactionCount: currentSlot * 100
  });
};

export const getLeaderSchedule: RpcMethodHandler = (id, params, context) => {
  const [_slot, _config] = params || [];
  
  // Return a simple leader schedule with a single validator
  const identity = "11111111111111111111111111111111";
  const schedule: Record<string, number[]> = {};
  schedule[identity] = Array.from({ length: 100 }, (_, i) => i);
  
  return context.createSuccessResponse(id, schedule);
};

export const getSlotLeader: RpcMethodHandler = (id, _params, context) => {
  // Return a consistent leader pubkey
  const LEADER_PUBKEY = "11111111111111111111111111111111";
  return context.createSuccessResponse(id, LEADER_PUBKEY);
};

export const getSlotLeaders: RpcMethodHandler = (id, params, context) => {
  const [_startSlot, limit] = params;
  const LEADER_PUBKEY = "11111111111111111111111111111111";
  
  const count = Math.min(limit || 100, 5000);
  const leaders = Array(count).fill(LEADER_PUBKEY);
  
  return context.createSuccessResponse(id, leaders);
};

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

export const getClusterNodes: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, [
    {
      pubkey: "11111111111111111111111111111111",
      gossip: "127.0.0.1:8001",
      tpu: "127.0.0.1:8003",
      rpc: "127.0.0.1:8899",
      version: "1.17.0"
    }
  ]);
};

export const getStakeActivation: RpcMethodHandler = (id, params, context) => {
  const [_pubkey, _config] = params;
  
  return context.createSuccessResponse(id, {
    state: "active",
    active: 1000000000,
    inactive: 0
  });
};

export const getMaxRetransmitSlot: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, Number(context.slot));
};

export const getHighestSnapshotSlot: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    full: 0,
    incremental: null
  });
};

export const minimumLedgerSlot: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, 0);
};