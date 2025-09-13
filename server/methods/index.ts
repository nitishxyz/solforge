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
  getVersion
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
  getVersion
};
