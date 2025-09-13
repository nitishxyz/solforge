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
  getSignatureStatuses,
  getParsedTransaction
} from "./transaction";

import {
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getBlock
} from "./block";

import {
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion
} from "./system";

import {
  getBlockTime,
  getBlocks,
  getFirstAvailableBlock,
  getGenesisHash,
  getIdentity,
  getInflationGovernor,
  getInflationRate,
  getSupply,
  getBlockProduction
} from "./program";

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

import {
  getRecentPerformanceSamples,
  getTransactionCount
} from "./performance";

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
  getParsedTransaction,
  getSignatureStatuses,
  
  // Block methods
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getBlock,
  
  // System methods
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion,
  // Program/network info methods
  getBlockTime,
  getBlocks,
  getFirstAvailableBlock,
  getGenesisHash,
  getIdentity,
  getInflationGovernor,
  getInflationRate,
  getSupply,
  getBlockProduction,
  
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
  // Performance metrics
  getRecentPerformanceSamples,
  getTransactionCount,
  
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
  getBlock,
  getMinimumBalanceForRentExemption,
  getHealth,
  getVersion,
  getBlockTime,
  getBlocks,
  getFirstAvailableBlock,
  getGenesisHash,
  getIdentity,
  getInflationGovernor,
  getInflationRate,
  getSupply,
  getBlockProduction,
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
  getRecentPerformanceSamples,
  getTransactionCount,
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
};
