# SolForge – LiteSVM RPC Server

A fast, Bun-native Solana JSON‑RPC server powered by LiteSVM. Designed as a drop‑in developer replacement for solana-test-validator with sub‑second startup, rich RPC coverage, and pragmatic defaults for local workflows.

## Features

- ✅ Broad Solana JSON‑RPC coverage (HTTP + PubSub for signatures)
- ⚡ Sub‑second startup; in‑memory execution via LiteSVM
- 💧 Real airdrops via faucet transfers (no .airdrop rate limits)
- 🗃️ Ephemeral DB (Bun + Drizzle + SQLite) for rich history during a run
- 🧰 Works with Solana CLI, Anchor (default settings), @solana/kit, and web3.js

## Install

```bash
bun install
```

## Quick Start

### Start the RPC server

```bash
DEBUG_RPC_LOG=1 bun run index.ts
```

You should see a faucet line on boot:

💧 Faucet loaded: <PUBKEY> with 1000000 SOL

By default, SolForge mints 1,000,000 SOL at startup and fully funds a persistent faucet account stored at `.solforge/faucet.json`.

### Connect with Solana CLI

```bash
solana config set -u http://localhost:8899
```

### Use with @solana/kit

```typescript
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('http://localhost:8899');

// Use the RPC client normally
const { value: balance } = await rpc.getBalance(address).send();
```

### Use with @solana/web3.js

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection('http://localhost:8899', 'confirmed');

// Use the connection normally
const balance = await connection.getBalance(publicKey);
```

## RPC Coverage (high‑level)

- Accounts: getAccountInfo, getMultipleAccounts, getBalance, getParsedAccountInfo
- Blocks/Slots: getLatestBlockhash, getBlock, getBlocks, getBlocksWithLimit, getBlockHeight, getBlockTime, getSlot
- Transactions: sendTransaction, simulateTransaction, getTransaction, getParsedTransaction, getSignatureStatuses, getSignaturesForAddress
- Fees: getFeeForMessage, getFees, getFeeCalculatorForBlockhash, getFeeRateGovernor, getRecentPrioritizationFees
- Epoch/Cluster: getEpochInfo, getEpochSchedule, getLeaderSchedule, getSlotLeader, getSlotLeaders, getVoteAccounts, getClusterNodes, getMaxRetransmitSlot, getMaxShredInsertSlot, getHighestSnapshotSlot, minimumLedgerSlot, getStakeMinimumDelegation
- Network/System: getHealth, getVersion, getIdentity, getGenesisHash, getFirstAvailableBlock, getBlockProduction, getBlockCommitment, getSupply, getInflationRate/Governor/Reward
- Programs: getProgramAccounts, getParsedProgramAccounts
- Address Lookup Table: getAddressLookupTable

Notes
- Signature PubSub is available on `ws://localhost:<port+1>` (signatureSubscribe/unsubscribe). Other subscriptions are stubbed to succeed without notifications.
- Token RPCs are minimally implemented (returning empty/default values) unless driven by indexed data. We can extend these as needed.

## Airdrops

- Airdrops are implemented as real SystemProgram transfers from the server faucet to the requested address — no rate limits.
- Each airdrop appends a memo with a random nonce to ensure a unique signature.
- The faucet keypair is persisted at `.solforge/faucet.json` and funded at startup.

To airdrop via CLI:

```bash
solana airdrop 1
```

## Data & Persistence

- Ephemeral by default: a local SQLite DB (`.solforge/db.db`) is recreated on every start. This DB stores:
  - Full raw transactions (base64) + logs + balances + fee + status + timestamps
  - Key account snapshots (lamports, owner, data_len, last_slot)
  - Address ↔ signature index for getSignaturesForAddress
  - Program account scan index for getProgramAccounts
- On restart, the DB is reset to match a fresh LiteSVM; during a run, it enables explorer‑style queries and rich getTransaction even after app restarts.
- Migrations run automatically at startup using Drizzle.

Drizzle Studio config (example):

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: `file:.solforge/db.db` },
});
```

## Configuration (env)

- `RPC_PORT` — HTTP port (default 8899); WS uses `port+1`.
- `DEBUG_RPC_LOG=1` — logs each RPC request.
- `SOLFORGE_DB_MODE` — `ephemeral` (default) or `persistent`.
- `SOLFORGE_DB_PATH` — override DB path (default `.solforge/db.db`).
- `DRIZZLE_MIGRATIONS` — migrations folder (default `drizzle`).
- `SOLFORGE_FAUCET_PATH` — faucet key file (default `.solforge/faucet.json`).
- `SOLFORGE_FAUCET_LAMPORTS` — faucet funding target in lamports (default 1,000,000 SOL).

Runtime defaults
- LiteSVM: `withSigverify(false)`, `withBlockhashCheck(false)`, `withTransactionHistory(1000n)`, `withLamports(1_000_000 SOL)`.
- You can toggle stricter behavior later; see “Notes for Anchor”.

Run the test client to verify functionality:

```bash
# Start the server in one terminal
bun run index.ts

# In another terminal, run the test
bun run test-client.ts
```

## Architecture

- LiteSVM for fast, in‑memory execution
- Bun.serve() for HTTP + WebSocket
- Drizzle + bun:sqlite for ephemeral data indexing

## Key Differences vs solana-test-validator

- Startup: < 1s vs 10–30s
- Memory: tiny vs heavy
- Ledger: ephemeral DB vs full ledger
- PubSub: signature notifications supported; other subs stubbed
- Validation: by default, signature and blockhash checks are relaxed for dev speed

## Notes for Anchor / Strictness

- For Anchor deploys, keep `withSigverify(false)` and `withBlockhashCheck(false)` (defaults). Enabling sigverify can cause loader transactions to fail unless every signer and message field exactly matches LiteSVM’s stricter checks.
- If you enable stricter checks later, turn on `DEBUG_RPC_LOG=1` and capture the first failing sendTransaction to diagnose.

## Limitations

- DB is ephemeral by default (resets each start). You can opt into persistence.
- Token RPCs are minimal unless we add token indexing (planned).
- Some advanced RPCs are stubs or simplified for local dev.

## Project Structure (selected)
```
solforge/
├── index.ts                         # Server entry
├── server/
│   ├── rpc-server.ts                # HTTP server + context
│   ├── ws-server.ts                 # WebSocket PubSub (signatures)
│   ├── methods/                     # RPC methods (modularized)
│   └── lib/                         # helpers (base58, faucet)
├── src/db/                          # Drizzle + SQLite setup
│   ├── index.ts                     # DB connect + migrator
│   ├── tx-store.ts                  # DB operations helper
│   └── schema/                      # One file per table
├── drizzle/                         # Drizzle SQL migrations
├── docs/data-indexing-plan.md       # Indexing plan
├── test-client.ts                   # @solana/kit smoke test
└── README.md
```

### Adding Custom Programs

```typescript
import { PublicKey } from "@solana/web3.js";

// Add from file
svm.addProgramFromFile(
  new PublicKey("YourProgram111111111111111111111111111111111"),
  "./path/to/program.so"
);

// Add from bytes
svm.addProgram(programId, programBytes);
```

## Adding New RPC Methods

The server uses a modular architecture. To add new RPC methods:

1. **Create a method file** in `server/methods/` (e.g., `custom.ts`)
2. **Implement the method** following the `RpcMethodHandler` interface
3. **Export the method** in `server/methods/index.ts`
4. **Add to the rpcMethods object**

Example:

```typescript
// server/methods/custom.ts
import type { RpcMethodHandler } from "../types";

export const getCustomData: RpcMethodHandler = (id, params, context) => {
  // Your implementation here
  return context.createSuccessResponse(id, { custom: "data" });
};

// server/methods/index.ts
import { getCustomData } from "./custom";

export const rpcMethods: Record<string, RpcMethodHandler> = {
  // ... existing methods
  getCustomData,
};
```

This project was created using `bun init` in bun v1.2.21. Bun is a fast all‑in‑one JavaScript runtime.
