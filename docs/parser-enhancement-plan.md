# Parser Enhancement Plan

## Current State Analysis

### ✅ What We Parse Today

**System Program** (`instruction-parser.ts` lines 86-202)
- ✅ Create, Transfer, TransferWithSeed
- ✅ Allocate, AllocateWithSeed, Assign, AssignWithSeed
- ⚠️ Nonce operations (recognized but not decoded)

**SPL Token & Token-2022** (`parsers/spl-token.ts`)
- ✅ MintToChecked (full decode)
- ✅ Transfer, TransferChecked (with mint hints)
- ✅ InitializeAccount3, InitializeImmutableOwner
- ✅ Fallback opcode classification (44 instruction types mapped)
- ⚠️ Extension instructions (recognized by opcode only, not decoded)

**Associated Token Account** (`parsers/spl-associated-token-account.ts`)
- ✅ Create/CreateIdempotent

**Compute Budget** (`instruction-parser.ts` lines 204-234)
- ✅ SetComputeUnitLimit, SetComputeUnitPrice
- ✅ RequestHeapFrame, RequestUnits

**Stake Program** (`instruction-parser.ts` lines 236-270)
- ✅ Initialize, Delegate, Authorize
- ⚠️ Split, Withdraw, Deactivate, Merge (recognized but not decoded)

**Vote Program** (`instruction-parser.ts` lines 272-287)
- ⚠️ All instructions recognized but minimal decoding

**Address Lookup Table** (`instruction-parser.ts` lines 289-300)
- ⚠️ All instructions recognized but not decoded

**SPL Memo** (`instruction-parser.ts` lines 303-313)
- ✅ Memo parsing (UTF-8 decode)

---

## 🚨 Critical Gaps

### 1. Token-2022 Extension Instructions (MAJOR GAP)

According to [Rust docs](https://docs.rs/spl-token-2022/latest/spl_token_2022/instruction/enum.TokenInstruction.html), there are **45 instruction variants**, but we only parse **~10** fully.

#### Missing Extension Instruction Groups:

**A. Transfer Fee Extension** (Variant: `TransferFeeExtension`)
- Sub-instructions not decoded:
  - `InitializeTransferFeeConfig`
  - `TransferCheckedWithFee` 
  - `WithdrawWithheldTokensFromMint`
  - `WithdrawWithheldTokensFromAccounts`
  - `HarvestWithheldTokensToMint`
  - `SetTransferFee`

**B. Confidential Transfer Extension** (Variant: `ConfidentialTransferExtension`)
- Sub-instructions not decoded:
  - `InitializeConfidentialTransferMint`
  - `UpdateConfidentialTransferMint`
  - `ConfigureConfidentialTransferAccount`
  - `ApproveConfidentialTransferAccount`
  - `EmptyConfidentialTransferAccount`
  - `Deposit`
  - `Withdraw`
  - `Transfer` (confidential)
  - `ApplyPendingBalance`
  - `EnableConfidentialCredits`
  - `DisableConfidentialCredits`
  - `EnableNonConfidentialCredits`
  - `DisableNonConfidentialCredits`

**C. Confidential Transfer Fee Extension** (Variant: `ConfidentialTransferFeeExtension`)
- Sub-instructions not decoded:
  - `InitializeConfidentialTransferFeeConfig`
  - `WithdrawWithheldTokensFromMint`
  - `WithdrawWithheldTokensFromAccounts`
  - `HarvestWithheldTokensToMint`
  - `EnableHarvestToMint`
  - `DisableHarvestToMint`

**D. Interest Bearing Mint Extension** (Variant: `InterestBearingMintExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `UpdateRate`

**E. Default Account State Extension** (Variant: `DefaultAccountStateExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**F. Memo Transfer Extension** (Variant: `MemoTransferExtension`)
- Sub-instructions not decoded:
  - `Enable`
  - `Disable`

**G. CPI Guard Extension** (Variant: `CpiGuardExtension`)
- Sub-instructions not decoded:
  - `Enable`
  - `Disable`

**H. Transfer Hook Extension** (Variant: `TransferHookExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**I. Metadata Pointer Extension** (Variant: `MetadataPointerExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**J. Group Pointer Extension** (Variant: `GroupPointerExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**K. Group Member Pointer Extension** (Variant: `GroupMemberPointerExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**L. Pausable Extension** (Variant: `PausableExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Pause`
  - `Resume`

**M. Scaled UI Amount Extension** (Variant: `ScaledUiAmountExtension`)
- Sub-instructions not decoded:
  - `Initialize`
  - `Update`

**N. Confidential Mint Burn Extension** (Variant: `ConfidentialMintBurnExtension`)
- All sub-instructions not decoded

#### Missing Core Token Instructions:

- ❌ `Approve` (opcode 4)
- ❌ `Revoke` (opcode 5)
- ❌ `SetAuthority` (opcode 6)
- ❌ `MintTo` (opcode 7)
- ❌ `Burn` (opcode 8)
- ❌ `BurnChecked` (opcode 15)
- ❌ `CloseAccount` (opcode 9)
- ❌ `FreezeAccount` (opcode 10)
- ❌ `ThawAccount` (opcode 11)
- ❌ `ApproveChecked` (opcode 13)
- ❌ `InitializeAccount` (opcode 1)
- ❌ `InitializeAccount2` (opcode 16)
- ❌ `InitializeMint` (opcode 0)
- ❌ `InitializeMint2` (opcode 20)
- ❌ `InitializeMultisig` (opcode 2)
- ❌ `InitializeMultisig2` (opcode 19)
- ❌ `SyncNative` (opcode 17)
- ❌ `Reallocate` (opcode 29)
- ❌ `CreateNativeMint` (opcode 31)
- ❌ `InitializeNonTransferableMint` (opcode 32)
- ❌ `InitializeMintCloseAuthority` (opcode 25)
- ❌ `InitializePermanentDelegate` (opcode 35)
- ❌ `AmountToUiAmount` (opcode 23)
- ❌ `UiAmountToAmount` (opcode 24)
- ❌ `WithdrawExcessLamports` (opcode 39)

### 2. Other Program Gaps

**Metaplex Programs** (NOT PARSED AT ALL)
- Token Metadata Program
- Candy Machine v2/v3
- Auction House
- Bubblegum (cNFTs)

**Anchor Programs** (NOT PARSED AT ALL)
- No generic Anchor IDL support
- Cannot parse custom program instructions

**Other Core Programs**
- BPF Loader (upgrades)
- Config Program
- Secp256k1 Program

---

## 🎯 Proposed Enhancement Strategy

### Phase 1: Complete Token-2022 Core Instructions (HIGH PRIORITY)

**Goal:** Parse all 25 core token instructions fully

**Files to update:**
- `packages/server/src/lib/parsers/spl-token.ts`

**Approach:**
1. Add decoders for missing core instructions using `@solana/spl-token` functions
2. For instructions without SDK decoders, manually parse based on [Rust source](https://github.com/solana-program/token-2022/blob/main/program/src/instruction.rs)

**Estimated effort:** M (2-3 days)

**Impact:** 🔥 Critical - many transactions use Approve, Burn, CloseAccount, etc.

---

### Phase 2: Token-2022 Extension Instruction Parsers (HIGH PRIORITY)

**Goal:** Decode all extension sub-instructions

**Files to create:**
- `packages/server/src/lib/parsers/extensions/transfer-fee.ts`
- `packages/server/src/lib/parsers/extensions/confidential-transfer.ts`
- `packages/server/src/lib/parsers/extensions/interest-bearing.ts`
- `packages/server/src/lib/parsers/extensions/default-account-state.ts`
- `packages/server/src/lib/parsers/extensions/memo-transfer.ts`
- `packages/server/src/lib/parsers/extensions/cpi-guard.ts`
- `packages/server/src/lib/parsers/extensions/transfer-hook.ts`
- `packages/server/src/lib/parsers/extensions/metadata-pointer.ts`
- `packages/server/src/lib/parsers/extensions/group-pointer.ts`
- `packages/server/src/lib/parsers/extensions/pausable.ts`

**Approach:**
1. Each extension variant contains a nested instruction enum
2. First byte after main opcode = extension sub-instruction discriminator
3. Parse based on [extension instruction sources](https://github.com/solana-program/token-2022/tree/main/program/src/extension)

**Estimated effort:** L (5-7 days)

**Impact:** 🔥 Critical for Token-2022 adoption - transfer fees, confidential transfers are commonly used

---

### Phase 3: IDL-Based Custom Program Parser (FUTURE-PROOF)

**Goal:** Parse any Anchor program using its IDL

**Architecture:**

```typescript
// packages/server/src/lib/idl-parser.ts

interface IDLCache {
  programId: string;
  idl: Idl;
  lastFetched: number;
}

class IDLParser {
  private cache: Map<string, IDLCache>;
  
  async parseInstruction(
    programId: string,
    data: Buffer,
    accounts: PublicKey[]
  ): Promise<ParsedInstruction | null> {
    const idl = await this.getIDL(programId);
    if (!idl) return null;
    
    // Use @coral-xyz/anchor to decode
    const coder = new BorshInstructionCoder(idl);
    const ix = coder.decode(data);
    
    return {
      program: idl.name,
      programId,
      parsed: {
        type: ix.name,
        info: ix.data
      }
    };
  }
  
  private async getIDL(programId: string): Promise<Idl | null> {
    // 1. Check memory cache
    if (this.cache.has(programId)) return this.cache.get(programId)!.idl;
    
    // 2. Check local storage (./idls/${programId}.json)
    const local = await this.loadFromDisk(programId);
    if (local) return local;
    
    // 3. Fetch from on-chain IDL account (Anchor programs)
    const onchain = await this.fetchOnchainIDL(programId);
    if (onchain) {
      await this.saveToDisk(programId, onchain);
      return onchain;
    }
    
    return null;
  }
}
```

**Storage Strategy:**
```
.solforge/
  idls/
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA.json  # SPL Token
    <program-id>.json                                  # Custom programs
```

**Estimated effort:** L (4-5 days)

**Impact:** 🚀 Game-changer - enables parsing ANY Anchor program

---

### Phase 4: Metaplex Program Parsers (MEDIUM PRIORITY)

**Goal:** Parse common Metaplex instructions

**Files to create:**
- `packages/server/src/lib/parsers/metaplex/token-metadata.ts`
- `packages/server/src/lib/parsers/metaplex/candy-machine.ts`
- `packages/server/src/lib/parsers/metaplex/bubblegum.ts`

**Approach:**
Use Metaplex SDKs:
- `@metaplex-foundation/mpl-token-metadata`
- `@metaplex-foundation/mpl-candy-machine`
- `@metaplex-foundation/mpl-bubblegum`

**Estimated effort:** M (3-4 days)

**Impact:** 🎨 Important for NFT testing scenarios

---

## Implementation Plan

### Recommended Order:

1. **Phase 1: Token-2022 Core** (Week 1)
   - Immediate impact, fills biggest gaps
   
2. **Phase 2: Extension Parsers** (Week 2-3)
   - Start with Transfer Fee (most common)
   - Then Confidential Transfer, Interest Bearing
   - Lower priority: Metadata Pointer, Group Pointer, Pausable

3. **Phase 3: IDL-Based Parser** (Week 4)
   - Future-proofs the system
   - Reduces maintenance burden

4. **Phase 4: Metaplex** (Week 5)
   - Nice-to-have for NFT scenarios

---

## Parser Architecture Improvements

### Current Structure:
```
instruction-parser.ts    # Monolithic, 328 lines
  ├─ System
  ├─ SPL Token (minimal)
  ├─ Compute Budget
  ├─ Stake
  └─ Vote

parsers/
  ├─ spl-token.ts        # 340 lines, handles both v1 and v2
  └─ spl-associated-token-account.ts
```

### Proposed Structure:
```
lib/
  instruction-parser.ts           # Entry point, delegates to parsers
  parsers/
    system.ts                     # System program
    compute-budget.ts
    stake.ts
    vote.ts
    address-lookup-table.ts
    spl-memo.ts
    spl-token/
      index.ts                    # Main token parser
      core-instructions.ts        # 25 core instructions
      extensions/
        transfer-fee.ts
        confidential-transfer.ts
        interest-bearing.ts
        default-account-state.ts
        memo-transfer.ts
        cpi-guard.ts
        transfer-hook.ts
        metadata-pointer.ts
        group-pointer.ts
        pausable.ts
    spl-associated-token-account.ts
    metaplex/
      token-metadata.ts
      candy-machine.ts
      bubblegum.ts
    idl-parser.ts                 # Generic Anchor program parser
```

---

## Testing Strategy

### Current Test Coverage: ❌ NONE

### Proposed Tests:

**Unit tests for each parser:**
```typescript
// packages/server/src/lib/parsers/__tests__/spl-token-core.test.ts
import { test, expect } from "bun:test";

test("parses Approve instruction", () => {
  const data = "..."; // base58 encoded approve instruction
  const accounts = [...];
  const parsed = parseTokenInstruction(data, accounts);
  
  expect(parsed.parsed.type).toBe("approve");
  expect(parsed.parsed.info.delegate).toBe("...");
  expect(parsed.parsed.info.amount).toBe("1000");
});
```

**Integration tests with real transactions:**
```typescript
// Use actual mainnet txs that contain extension instructions
test("parses real transfer fee transaction", async () => {
  const sig = "..."; // Known transfer fee tx
  const tx = await getTransaction(sig);
  const ix = tx.transaction.message.instructions[0];
  
  expect(ix.parsed.type).toBe("transferCheckedWithFee");
});
```

---

## Maintenance Considerations

### Version Tracking:
- Token-2022 is actively evolving
- New extensions are added regularly
- Need process to detect and add new instruction types

### Monitoring:
- Log unparsed instruction opcodes
- Alert when unknown opcodes are encountered
- Dashboard showing parser coverage %

### Documentation:
- Each parser should link to source of truth (Rust docs, SDK)
- Document which instruction variants are supported
- Keep CHANGELOG.md updated with new parsers

---

## Success Metrics

**Coverage Metrics:**
- % of SPL Token instructions parsed: Currently ~20% → Target 100%
- % of Token-2022 instructions parsed: Currently ~20% → Target 90%
- % of transactions fully parsed: Currently ~40% → Target 80%

**Quality Metrics:**
- Parser test coverage: Currently 0% → Target 80%
- Parsing errors per 1000 transactions: Track and minimize

**Developer Experience:**
- Time to add new parser: Target <2 hours (with IDL support)
- Documentation completeness: Target 100%

---

## Next Steps

1. **Discuss & Prioritize:**
   - Which phases are must-have vs. nice-to-have?
   - What's the timeline/urgency?

2. **Start with Quick Wins:**
   - Phase 1 (Token-2022 Core) has highest ROI
   - Can be done in parallel with architecture refactor

3. **Set Up Infrastructure:**
   - Create test framework
   - Set up IDL storage directory
   - Add parser coverage monitoring

4. **Incremental Implementation:**
   - Don't try to do everything at once
   - Ship parsers as they're completed
   - Get feedback from users

---

## Open Questions

1. **IDL Storage:** Should we bundle common IDLs or fetch on-demand?
2. **Parser Performance:** Should we cache parsed results?
3. **Versioning:** How to handle program upgrades that change instruction layouts?
4. **Custom Programs:** Should users be able to provide their own IDLs?
5. **Error Handling:** What should we return for unparseable instructions?

