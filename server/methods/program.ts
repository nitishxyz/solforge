import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../types";

export const getProgramAccounts: RpcMethodHandler = (id, params, context) => {
  const [programId, _config] = params;
  
  try {
    const programPubkey = new PublicKey(programId);
    const _programBytes = programPubkey.toBytes();
    
    // For now, return empty array as LiteSVM doesn't have getProgramAccounts
    // This is a placeholder until the method is available
    const accounts: any[] = [];
    
    return context.createSuccessResponse(id, accounts);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

export const getBlockProduction: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      byIdentity: {},
      range: {
        firstSlot: 0,
        lastSlot: Number(context.slot)
      }
    }
  });
};

export const getBlockCommitment: RpcMethodHandler = (id, params, context) => {
  const [_slot] = params;
  
  return context.createSuccessResponse(id, {
    commitment: [Number(context.slot), 0],
    totalStake: 1000000000
  });
};

export const getBlocks: RpcMethodHandler = (id, params, context) => {
  const [startSlot, endSlot] = params;
  
  const start = Number(startSlot || 0);
  const end = Number(endSlot || context.slot);
  const blocks = [];
  
  for (let i = start; i <= end && i <= Number(context.slot); i++) {
    blocks.push(i);
  }
  
  return context.createSuccessResponse(id, blocks);
};

export const getBlockTime: RpcMethodHandler = (id, params, context) => {
  const [slot] = params;
  
  if (slot > Number(context.slot)) {
    return context.createSuccessResponse(id, null);
  }
  
  const SLOT_TIME_MS = 400;
  const currentTime = Math.floor(Date.now() / 1000);
  const slotDiff = Number(context.slot) - slot;
  const blockTime = currentTime - Math.floor(slotDiff * SLOT_TIME_MS / 1000);
  
  return context.createSuccessResponse(id, blockTime);
};

export const getFirstAvailableBlock: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, 0);
};

export const getGenesisHash: RpcMethodHandler = (id, _params, context) => {
  const GENESIS_HASH = "11111111111111111111111111111111";
  return context.createSuccessResponse(id, GENESIS_HASH);
};

export const getIdentity: RpcMethodHandler = (id, _params, context) => {
  const IDENTITY_PUBKEY = "11111111111111111111111111111111";
  return context.createSuccessResponse(id, {
    identity: IDENTITY_PUBKEY
  });
};

export const getInflationGovernor: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    foundation: 0.05,
    foundationTerm: 7,
    initial: 0.15,
    taper: 0.15,
    terminal: 0.015
  });
};

export const getInflationRate: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    epoch: 0,
    foundation: 0.05,
    total: 0.15,
    validator: 0.10
  });
};

export const getInflationReward: RpcMethodHandler = (id, params, context) => {
  const [addresses] = params;
  
  const rewards = addresses.map(() => ({
    amount: 0,
    effectiveSlot: Number(context.slot),
    epoch: 0,
    postBalance: 1000000000
  }));
  
  return context.createSuccessResponse(id, rewards);
};

export const getSupply: RpcMethodHandler = (id, _params, context) => {
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      circulating: 1000000000000,
      nonCirculating: 0,
      nonCirculatingAccounts: [],
      total: 1000000000000
    }
  });
};

export const getTokenAccountBalance: RpcMethodHandler = (id, params, context) => {
  const [pubkey] = params;
  
  try {
    const pubkeyBytes = context.decodeBase58(pubkey);
    const account = context.svm.getAccount(new PublicKey(pubkeyBytes));
    
    if (!account) {
      return context.createErrorResponse(id, -32602, "Account not found");
    }
    
    return context.createSuccessResponse(id, {
      context: { slot: Number(context.slot) },
      value: {
        amount: "0",
        decimals: 9,
        uiAmount: 0.0,
        uiAmountString: "0"
      }
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};

export const getTokenAccountsByOwner: RpcMethodHandler = (id, params, context) => {
  const [_owner, _filter] = params;
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};

export const getTokenSupply: RpcMethodHandler = (id, params, context) => {
  const [_mint] = params;
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: {
      amount: "1000000000",
      decimals: 9,
      uiAmount: 1.0,
      uiAmountString: "1"
    }
  });
};

export const getTokenLargestAccounts: RpcMethodHandler = (id, params, context) => {
  const [_mint] = params;
  
  return context.createSuccessResponse(id, {
    context: { slot: Number(context.slot) },
    value: []
  });
};