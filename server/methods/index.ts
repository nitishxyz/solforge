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
  getParsedTransaction,
  getSignaturesForAddress,
  getConfirmedTransaction
} from "./transaction";

import {
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getBlock,
  getBlocksWithLimit
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
  getInflationReward,
  getSupply,
  getBlockProduction,
  getParsedProgramAccounts,
  getProgramAccounts,
  getTokenAccountBalance,
  getTokenAccountsByOwner,
  getTokenAccountsByDelegate,
  getParsedTokenAccountsByOwner,
  getParsedTokenAccountsByDelegate,
  getTokenLargestAccounts,
  getTokenSupply,
  getBlockCommitment,
  getLargestAccounts
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
  minimumLedgerSlot,
  getStakeMinimumDelegation,
  getMaxShredInsertSlot
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
  getSignaturesForAddress,
  getConfirmedTransaction,
  
  // Block methods
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getBlock,
  getBlocksWithLimit,
  
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
  getInflationReward,
  getSupply,
  getBlockProduction,
  getParsedProgramAccounts,
  getProgramAccounts,
  getTokenAccountBalance,
  getTokenAccountsByOwner,
  getTokenAccountsByDelegate,
  getParsedTokenAccountsByOwner,
  getParsedTokenAccountsByDelegate,
  getTokenLargestAccounts,
  getTokenSupply,
  getBlockCommitment,
  getLargestAccounts,
  
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
  getStakeMinimumDelegation,
  getMaxShredInsertSlot,
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
  getSignaturesForAddress,
  getConfirmedTransaction,
  getLatestBlockhash,
  getSlot,
  getBlockHeight,
  isBlockhashValid,
  getBlock,
  getBlocksWithLimit,
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
  getInflationReward,
  getSupply,
  getBlockProduction,
  getParsedProgramAccounts,
  getProgramAccounts,
  getTokenAccountBalance,
  getTokenAccountsByOwner,
  getTokenAccountsByDelegate,
  getTokenLargestAccounts,
  getTokenSupply,
  getBlockCommitment,
  getLargestAccounts,
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
  getStakeMinimumDelegation,
  getMaxShredInsertSlot,
  getRecentPerformanceSamples,
  getTransactionCount,
  getAddressLookupTable,
  getRecentPrioritizationFees,
  getFeeForMessage,
  getFees,
  getFeeCalculatorForBlockhash,
  getFeeRateGovernor
};
