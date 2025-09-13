# SolForge Data Indexing Plan (Bun + Drizzle ORM + SQLite)

This plan proposes a durable, fast, and simple data indexing layer for SolForge using Bun's native SQLite driver with Drizzle ORM. The goal is to persist and index everything relevant (transactions, accounts, token data, addresses, blocks) so we can power missing RPCs, explorer views, and historical queries that LiteSVM does not natively provide.

## Objectives

- Persist all state-changing events and key reads for durability and queryability.
- Provide fast lookups for explorer-style methods (e.g., getSignaturesForAddress, getProgramAccounts, token queries).
- Maintain an in-memory hot cache for the most recent N items while SQLite is the source of truth.
- Keep the implementation simple and Bun-native: Bun + Drizzle + `bun:sqlite`.

## Tech Choices

- Storage: SQLite (via Bun's `bun:sqlite`) with WAL mode.
- ORM / schema: Drizzle ORM for schema definition and migrations.
- Runtime: Single-writer transaction queue; prepared statements for reads.
- Optional hot cache: Small LRU for last N transactions and frequently accessed accounts.

Reference: https://orm.drizzle.team/docs/connect-bun-sqlite

## High-Level Architecture

- Event-driven ingestion:
  - On `sendTransaction`/`requestAirdrop`, capture and store full transaction bundle and touch all involved accounts.
  - On `getAccountInfo`/`getMultipleAccounts`, opportunistically upsert latest account snapshots and update last-seen.
- Read path:
  - Explorer calls first check in-memory cache, then fall back to SQLite via Drizzle.
- Durability:
  - Store everything important, including raw wire tx (base64), logs, balances, version, and account snapshots.

## Drizzle Schema (SQLite)

- `transactions`
  - `signature` TEXT PRIMARY KEY
  - `slot` INTEGER NOT NULL
  - `block_time` INTEGER NULL
  - `version` TEXT NOT NULL              // 0 | "legacy"
  - `err_json` TEXT NULL                 // JSON or null
  - `fee` INTEGER NOT NULL
  - `raw_base64` TEXT NOT NULL
  - `pre_balances_json` TEXT NOT NULL
  - `post_balances_json` TEXT NOT NULL
  - `logs_json` TEXT NOT NULL
  - Index: `slot DESC`

- `tx_accounts`
  - `signature` TEXT NOT NULL
  - `account_index` INTEGER NOT NULL
  - `address` TEXT NOT NULL              // base58
  - `signer` INTEGER NOT NULL            // 0/1
  - `writable` INTEGER NOT NULL          // 0/1
  - `program_id_index` INTEGER NULL
  - PRIMARY KEY (`signature`, `account_index`)
  - Indexes: (`address`), (`address`, `signature`) for joins

- `addresses`
  - `address` TEXT PRIMARY KEY
  - `first_seen_slot` INTEGER
  - `last_seen_slot` INTEGER
  - `type` TEXT NULL                     // "program" | "system" | "user" | "pda" | "token-mint" | "token-account"

- `accounts` (latest snapshot)
  - `address` TEXT PRIMARY KEY
  - `lamports` INTEGER NOT NULL
  - `owner_program` TEXT NOT NULL
  - `executable` INTEGER NOT NULL
  - `rent_epoch` INTEGER NOT NULL
  - `data_len` INTEGER NOT NULL
  - `data_base64` TEXT NULL              // optional; off by default
  - `last_slot` INTEGER NOT NULL
  - Indexes: (`owner_program`), (`last_slot` DESC)

- `account_history` (optional, time-travel)
  - `address` TEXT NOT NULL
  - `slot` INTEGER NOT NULL
  - `lamports` INTEGER
  - `owner_program` TEXT
  - `data_len` INTEGER
  - `data_base64` TEXT NULL
  - PRIMARY KEY (`address`, `slot`)

- `address_signatures` (fast address → signatures)
  - `address` TEXT NOT NULL
  - `signature` TEXT NOT NULL
  - `slot` INTEGER NOT NULL
  - `err` INTEGER NOT NULL               // 0/1
  - `block_time` INTEGER NULL
  - PRIMARY KEY (`address`, `signature`)
  - Index: (`address`, `slot` DESC)

- Token normalization
  - `token_mints`:
    - `mint` TEXT PRIMARY KEY
    - `decimals` INTEGER
    - `supply` TEXT
    - `mint_authority` TEXT NULL
    - `freeze_authority` TEXT NULL
    - `last_slot` INTEGER
  - `token_accounts`:
    - `address` TEXT PRIMARY KEY
    - `mint` TEXT NOT NULL
    - `owner` TEXT NOT NULL
    - `amount` TEXT NOT NULL
    - `delegate` TEXT NULL
    - `delegated_amount` TEXT NULL
    - `state` TEXT NOT NULL
    - `is_native` INTEGER NOT NULL
    - `last_slot` INTEGER
  - Indexes: (`owner`), (`mint`)

- `blocks`
  - `slot` INTEGER PRIMARY KEY
  - `blockhash` TEXT
  - `previous_blockhash` TEXT
  - `parent_slot` INTEGER
  - `block_time` INTEGER

- `meta_kv`
  - `key` TEXT PRIMARY KEY
  - `value` TEXT

Notes:
- JSON is stored as TEXT in SQLite; parse at the API boundary.
- Raw transactions stored as base64 TEXT for simplicity.

## PRAGMA and DB Settings

- Execute at startup:
  - `PRAGMA journal_mode=WAL;`
  - `PRAGMA synchronous=NORMAL;`
  - `PRAGMA temp_store=MEMORY;`
  - `PRAGMA busy_timeout=1000;`

## Ingestion Pipelines

- Transaction ingestion (inside one DB transaction):
  1. Insert into `transactions` (signature, slot, block_time, version, fee, err_json, raw_base64, pre/post balances, logs).
  2. Insert into `tx_accounts` (one row per static account key) with signer/writable flags.
  3. Insert into `address_signatures` for each static account key, joining slot/err.
  4. For each static account key:
     - Pull latest account from LiteSVM and upsert into `accounts`.
     - Upsert into `addresses` (first_seen_slot if new, update last_seen_slot).
     - If owner is SPL Token program, decode and upsert `token_accounts` / `token_mints`.
  5. Upsert a `blocks` row tying slot → blockhash/parent_slot/block_time we return via RPC.

- Account read ingestion:
  - On `getAccountInfo`/`getMultipleAccounts`, upsert snapshot in `accounts` and update `addresses.last_seen_slot`.

## RPC Backed by Store

- `getTransaction` / `getParsedTransaction`:
  - Memory → SQLite by signature; return structured response (with `version`, `loadedAddresses`).
- `getSignatureStatuses`:
  - Memory → SQLite (when `searchTransactionHistory: true`) for slot/err.
- `getSignaturesForAddress`:
  - Query `address_signatures` + `transactions` with pagination (before/until/limit) and return explorer-style entries.
- `getProgramAccounts`:
  - Query `accounts` filtered by `owner_program` and optional data filters.
- `getTokenAccountsByOwner` / `getTokenAccountsByDelegate`:
  - Query `token_accounts` with appropriate filters.
- `getTokenSupply` / `getTokenLargestAccounts`:
  - Query `token_mints` and `token_accounts` (by `mint`) with ordering.

## Hot Cache Strategy

- Keep last N transactions and M account snapshots in-memory (LRU); always write-through to SQLite.
- Memory hits satisfy most recent reads; history and scans go to SQLite.

## Retention & Pruning

- Default: keep all rows (dev/local usage).
- Optional: environment-controlled retention by time/slot; prune oldest rows in `transactions` and cascade to `tx_accounts` / `address_signatures`.

## Implementation Phases

1. Drizzle bootstrap
   - Add DB connector (Bun + Drizzle), migrations directory, and PRAGMA setup.
2. Schema
   - Implement tables and indexes listed above; generate migrations.
3. Store module
   - `TxStore` interface with insert/query helpers; prepared statements; single-writer queue.
4. Wire into server
   - Inject store into `RpcMethodContext`; update `recordTransaction` to also persist bundles.
5. Replace stubs
   - Implement `getSignaturesForAddress`, `getProgramAccounts`, token endpoints using store.
6. Opportunistic account refresh
   - Upsert snapshots on account reads; optional background refresh for hot addresses.
7. Tests
   - `bun:test` for ingestion, pagination, filters, and legacy RPC shapes.
8. Backfill & durability
   - On boot, import any txs from in-memory records; consider opt-in on-disk WAL retention policy.
9. Perf tune
   - Review indexes, batch sizes, and PRAGMAs; add metrics.

## LiteSVM Gaps This Store Covers

- Persistent transaction history across restarts.
- Address → signature lookups (explorer/UX critical).
- Program account scans by `owner_program`.
- SPL Token queries by owner, delegate, and mint.
- Coherent block/time metadata.

## Open Questions

- Should we store raw account data (`data_base64`) by default? Proposal: off by default, enable via env for debugging.
- PDA detection: best-effort tagging (cannot always recover seeds deterministically).
- Future: add richer program parsers (e.g., SPL Token 2022, other common programs) if needed.

## Next Steps (for implementation later)

- Create `storage/tx-store.ts` with Drizzle setup and empty method stubs.
- Add `context.store` to `RpcMethodContext` and route `recordTransaction` into the store.
- Land schema/migrations; no behavior change yet.

