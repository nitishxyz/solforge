import type { RpcMethodHandler } from "../types";

// Account methods are now in a subdirectory for better organization
import {
  getAccountInfo,
  getBalance,
  getMultipleAccounts,
  requestAirdrop,
  getParsedAccountInfo
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
  getBlockProduction,
  getParsedProgramAccounts
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

import { getAddressLookupTable } from "./get-address-lookup-table";

export const rpcMethods: Record<string, RpcMethodHandler> = {
  // Account methods
  getAccountInfo,
  getBalance,
  getMultipleAccounts,
  requestAirdrop,
  getParsedAccountInfo,
  
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
  getParsedProgramAccounts,
  
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
  getAddressLookupTable,
  
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
  getParsedProgramAccounts,
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
  getAddressLookupTable,
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
};
