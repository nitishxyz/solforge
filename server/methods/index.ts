import type { RpcMethodHandler } from "../types";

// Account methods are now in a subdirectory for better organization
import {
  getAccountInfo,
  getBalance,
  getMultipleAccounts,
  requestAirdrop
} from "./account";

import {
  sendTransaction,
  simulateTransaction,
  getTransaction,
  getSignatureStatuses
} from "./transaction";

import {
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid
} from "./block";

import {
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion
} from "./system";

import {
  getEpochSchedule,
  getEpochInfo,
  getLeaderSchedule,
  getSlotLeader,
  getSlotLeaders,
  getVoteAccounts,
  getClusterNodes,
  getStakeActivation,
  getMaxRetransmitSlot,
  getHighestSnapshotSlot,
  minimumLedgerSlot
} from "./epoch";

import {
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
} from "./fee";

export const rpcMethods: Record<string, RpcMethodHandler> = {
  // Account methods
  getAccountInfo,
  getBalance,
  getMultipleAccounts,
  requestAirdrop,
  
  // Transaction methods
  sendTransaction,
  simulateTransaction,
  getTransaction,
  getSignatureStatuses,
  
  // Block methods
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  
  // System methods
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion,
  
  // Epoch/cluster methods
  getEpochSchedule,
  getEpochInfo,
  getLeaderSchedule,
  getSlotLeader,
  getSlotLeaders,
  getVoteAccounts,
  getClusterNodes,
  getStakeActivation,
  getMaxRetransmitSlot,
  getHighestSnapshotSlot,
  minimumLedgerSlot,
  
  // Fee methods
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
};

export {
  getAccountInfo,
  getBalance,
  getMultipleAccounts,
  requestAirdrop,
  sendTransaction,
  simulateTransaction,
  getTransaction,
  getSignatureStatuses,
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion,
  getEpochSchedule,
  getEpochInfo,
  getLeaderSchedule,
  getSlotLeader,
  getSlotLeaders,
  getVoteAccounts,
  getClusterNodes,
  getStakeActivation,
  getMaxRetransmitSlot,
  getHighestSnapshotSlot,
  minimumLedgerSlot,
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
};
