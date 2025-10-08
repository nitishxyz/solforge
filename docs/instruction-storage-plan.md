# Instruction Storage Plan

## Problem Statement
Currently, transaction instructions are parsed on-demand via `instruction-parser.ts` but never persisted to the database. This means:
- ❌ Cannot query transactions by instruction type (e.g., "find all SPL token transfers")
- ❌ Parsing overhead on every `getTransaction` call
- ❌ No instruction-level analytics or indexing

## Proposed Solution: `tx_instructions` Table

### Schema Design

```typescript
// packages/server/src/db/schema/tx-instructions.ts
export const txInstructions = sqliteTable(
  "tx_instructions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Linking and range filtering
    signature: text("signature").notNull(),
    slot: integer("slot").notNull(),

    // Position within the transaction
    topIndex: integer("top_index").notNull(),
    innerIndex: integer("inner_index").notNull().default(-1), // -1 = top-level

    // Program identification
    programId: text("program_id").notNull(),
    programKind: text("program_kind").notNull().default("unknown"),
    instructionType: text("instruction_type"),

    // Raw and parsed payloads
    rawDataBase58: text("raw_data_base58").notNull(),
    accountAddressesJson: text("account_addresses_json").notNull().default("[]"),
    accountIndicesJson: text("account_indices_json").notNull().default("[]"),
    parsedInfoJson: text("parsed_info_json").notNull().default("{}"),
  },
  (t) => ({
    uniqSigPos: uniqueIndex("u_tx_ins_sig_pos").on(t.signature, t.topIndex, t.innerIndex),
    sigIdx: index("idx_tx_ins_signature").on(t.signature),
    progTypeIdx: index("idx_tx_ins_program_kind_type").on(t.programKind, t.instructionType),
    programIdIdx: index("idx_tx_ins_program_id").on(t.programId),
    progTypeSlotIdx: index("idx_tx_ins_prog_type_slot").on(t.programKind, t.instructionType, t.slot),
    slotIdx: index("idx_tx_ins_slot").on(t.slot),
  }),
);
```

### Key Features

**Hybrid Storage Approach:**
- Scalar columns for fast filtering: `programKind`, `instructionType`, `slot`, `programId`
- JSON columns for variable data: `parsedInfoJson`, `accountAddressesJson`

**Position Tracking:**
- `topIndex`: Index in top-level instructions (0, 1, 2...)
- `innerIndex`: -1 for top-level, 0+ for inner instructions

**Program Classification:**
- `programKind`: "system", "spl-token", "computeBudget", "stake", "vote", "unknown"
- `instructionType`: "transfer", "delegate", "mintToChecked", etc.

### Enabled Queries

```sql
-- All SPL token transfers in slot range
SELECT * FROM tx_instructions 
WHERE program_kind IN ('spl-token', 'token-2022') 
  AND instruction_type IN ('transfer', 'transferChecked')
  AND slot BETWEEN ? AND ?;

-- All instructions for a transaction
SELECT * FROM tx_instructions WHERE signature = ?;

-- Custom program activity
SELECT * FROM tx_instructions WHERE program_id = ? AND slot > ?;

-- Time-ordered feeds
SELECT * FROM tx_instructions 
WHERE program_kind = ? AND slot BETWEEN ? AND ?;
```

### Migration Strategy

**Phase 1: Schema Creation**
```sql
-- drizzle/000X_tx_instructions.sql
CREATE TABLE tx_instructions (...);
CREATE UNIQUE INDEX u_tx_ins_sig_pos ON tx_instructions(signature, top_index, inner_index);
CREATE INDEX idx_tx_ins_signature ON tx_instructions(signature);
CREATE INDEX idx_tx_ins_program_kind_type ON tx_instructions(program_kind, instruction_type);
CREATE INDEX idx_tx_ins_program_id ON tx_instructions(program_id);
CREATE INDEX idx_tx_ins_prog_type_slot ON tx_instructions(program_kind, instruction_type, slot);
CREATE INDEX idx_tx_ins_slot ON tx_instructions(slot);
```

**Phase 2: Live Ingestion**
Update `rpc-server.ts` `recordTransaction()`:
1. Build `accountKeys` array (static + loaded addresses for v0)
2. Extract `tokenBalanceHints` from pre/postTokenBalances
3. For each top-level instruction:
   - Parse via `parseInstruction()`
   - Insert row with `innerIndex=-1`
4. For each inner instruction:
   - Parse via `parseInstruction()`
   - Insert row with parent `topIndex` and `innerIndex>=0`

**Phase 3: Backfill Existing Data**
- Batch process existing transactions (5k-20k at a time)
- Read `rawBase64`, decode, reconstruct accountKeys
- Parse all instructions, insert with `INSERT OR IGNORE`
- Idempotent via unique index on `(signature, topIndex, innerIndex)`

### Trade-offs

**Pros:**
- ✅ Fast queries via indexed scalar columns
- ✅ Flexible JSON storage for parsed data
- ✅ No breaking changes to existing schema
- ✅ Handles unknown programs gracefully

**Cons:**
- ❌ Cannot index deep JSON fields efficiently
- ❌ Per-account queries require full scan (unless we add `tx_instruction_accounts` table)
- ❌ Write amplification (1 tx → many instruction rows)

### Future Enhancements

**Advanced Path (if needed):**
```typescript
// For "all instructions involving address X" queries
export const txInstructionAccounts = sqliteTable(
  "tx_instruction_accounts",
  {
    instructionId: integer("instruction_id").notNull(),
    address: text("address").notNull(),
    isSigner: integer("is_signer").notNull(),
    isWritable: integer("is_writable").notNull(),
    ord: integer("ord").notNull(),
  },
  (t) => ({
    addressIdx: index("idx_tx_ins_accts_address").on(t.address, t.slot),
  })
);
```

### Implementation Checklist

- [ ] Create schema file: `packages/server/src/db/schema/tx-instructions.ts`
- [ ] Generate migration SQL
- [ ] Update `rpc-server.ts` ingestion logic
- [ ] Create backfill script
- [ ] Add query helpers to `TxStore`
- [ ] Update `getTransaction` to read from table instead of parsing on-demand
- [ ] Add tests for instruction storage
- [ ] Document query patterns

### Performance Considerations

- Use WAL mode for SQLite
- Batch inserts (1k-5k rows per transaction)
- Prepared statements for repeated operations
- Monitor index usage and adjust as needed

### Backward Compatibility

- Keep `transactions.innerInstructionsJson` for compatibility
- No changes to existing API responses
- Gradual migration path (backfill can happen async)
