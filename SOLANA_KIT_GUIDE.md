# Solana Kit Guide for LiteSVM RPC Server

## Overview
Solana Kit (formerly Web3.js v2) is a complete rewrite of the Web3.js library, designed to be more composable, customizable, and efficient. This guide covers how to use Kit with our LiteSVM RPC server implementation.

## Key Differences from Web3.js

### 1. No Connection Class
- **Web3.js**: Uses a `Connection` class as a central entry point
- **Kit**: Uses functional approach with `createSolanaRpc` and `createSolanaRpcSubscriptions`

### 2. Tree-Shakeable Design
- All functions are importable individually
- Only bundle what you use
- No classes, only functions and Proxy objects

### 3. Native TypeScript & Modern JS
- Uses native `bigint` for large values
- Native Ed25519 key support via `CryptoKeyPair`
- Strong TypeScript types throughout

## Core Concepts

### RPC Creation
```typescript
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

// Create RPC proxy for standard requests
const rpc = createSolanaRpc('http://localhost:8899');

// Create RPC subscriptions for WebSocket events
const rpcSubscriptions = createSolanaRpcSubscriptions('ws://localhost:8900');
```

### Addresses
```typescript
import { address, Address } from '@solana/kit';

// Create an address (replaces PublicKey)
const wallet = address('11111111111111111111111111111111');
```

### Signers
Kit uses signer objects instead of Keypair arrays:
```typescript
import { 
  generateKeyPairSigner,
  createNoopSigner,
  TransactionSigner 
} from '@solana/kit';

// Generate a new signer
const signer = await generateKeyPairSigner();

// Create a noop signer (for addresses that won't actually sign)
const noopSigner = createNoopSigner(address('1234...'));
```

## RPC Methods Mapping

### Account Operations
```typescript
// Get account info
const { value: account } = await rpc.getAccountInfo(wallet).send();

// Get balance
const { value: balance } = await rpc.getBalance(wallet).send();

// Helper functions
import { fetchEncodedAccount, assertAccountExists } from '@solana/kit';
const account = await fetchEncodedAccount(rpc, wallet);
assertAccountExists(account);
```

### Transaction Operations
```typescript
// Get latest blockhash
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// Send transaction
const signature = await rpc.sendTransaction(signedTransaction).send();

// Simulate transaction
const { value: simulation } = await rpc.simulateTransaction(transaction).send();
```

## Building Transactions

### Transaction Message Pipeline
```typescript
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  pipe
} from '@solana/kit';

const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayerSigner(payer, tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  tx => appendTransactionMessageInstructions(instructions, tx)
);
```

### Compiling and Signing
```typescript
import { 
  compileTransaction,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction 
} from '@solana/kit';

// Compile the message
const transaction = compileTransaction(transactionMessage);

// Sign with attached signers
const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

// Get signature
const signature = getSignatureFromTransaction(signedTransaction);
```

## Program Instructions

### System Program
```typescript
import { getTransferSolInstruction } from '@solana-program/system';

const instruction = getTransferSolInstruction({
  source: payerSigner,
  destination: recipientAddress,
  amount: 1_000_000_000n // 1 SOL in lamports
});
```

### Token Program
```typescript
import { getInitializeMintInstruction } from '@solana-program/token';

const instruction = getInitializeMintInstruction({
  mint: mintSigner.address,
  decimals: 9,
  mintAuthority: authorityAddress,
  freezeAuthority: null
});
```

## Codecs for Data Encoding/Decoding

```typescript
import {
  Codec,
  getStructCodec,
  getU8Codec,
  getU64Codec,
  getAddressCodec,
  getUtf8Codec,
  addCodecSizePrefix,
  getU32Codec
} from '@solana/kit';

// Define a codec for custom account data
type MyAccount = {
  version: number;
  owner: Address;
  balance: bigint;
  name: string;
};

const myAccountCodec: Codec<MyAccount> = getStructCodec([
  ['version', getU8Codec()],
  ['owner', getAddressCodec()],
  ['balance', getU64Codec()],
  ['name', addCodecSizePrefix(getUtf8Codec(), getU32Codec())]
]);

// Encode
const bytes = myAccountCodec.encode(accountData);

// Decode
const decoded = myAccountCodec.decode(bytes);
```

## RPC Method Requirements for LiteSVM

For our LiteSVM RPC server to work with Kit, we need to implement these RPC methods:

### Core Methods
- `getAccountInfo` - Get account data
- `getBalance` - Get account balance
- `getLatestBlockhash` - Get recent blockhash
- `sendTransaction` - Submit transaction
- `simulateTransaction` - Simulate without executing
- `requestAirdrop` - Request test SOL

### Additional Methods for Full Compatibility
- `getSignatureStatuses` - Check transaction status
- `getSlot` - Get current slot
- `getBlockHeight` - Get block height
- `getTransaction` - Get transaction by signature
- `getMultipleAccounts` - Batch account fetching
- `getMinimumBalanceForRentExemption` - Rent calculation

### For WebSocket Subscriptions
- `accountNotifications` - Account change events
- `signatureNotifications` - Transaction confirmation events
- `slotNotifications` - Slot change events

## Error Handling

Kit uses structured errors:
```typescript
import { isSolanaError, SOLANA_ERROR__TRANSACTION_SIGNATURE_NOT_FOUND } from '@solana/kit';

try {
  const result = await rpc.getTransaction(signature).send();
} catch (error) {
  if (isSolanaError(error, SOLANA_ERROR__TRANSACTION_SIGNATURE_NOT_FOUND)) {
    console.log('Transaction not found');
  }
}
```

## Testing with LiteSVM

When using Kit with our LiteSVM RPC server:

```typescript
// Connect to local LiteSVM RPC
const rpc = createSolanaRpc('http://localhost:8899');

// Use LiteSVM-specific features
const { value: airdropSig } = await rpc.requestAirdrop(wallet, 1_000_000_000n).send();

// All standard Kit operations work normally
const { value: balance } = await rpc.getBalance(wallet).send();
```

## Migration from Web3.js

Use the `@solana/compat` package for incremental migration:
```typescript
import { fromLegacyPublicKey, fromLegacyKeypair } from '@solana/compat';
import { PublicKey, Keypair } from '@solana/web3.js';

// Convert legacy types
const address = fromLegacyPublicKey(new PublicKey('...'));
const cryptoKeypair = await fromLegacyKeypair(Keypair.generate());
```