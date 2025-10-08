# SolForge Test Scripts

## test-all-parsers.ts

**Purpose:** Create transactions for every instruction type we've added parsers for, allowing you to verify parsing works correctly in the explorer.

### What It Tests

This script executes **23 different instruction types**:

#### Mint Initialization (2)
- ✅ InitializeMint (with rent sysvar)
- ✅ InitializeMint2 (without rent sysvar)

#### Account Initialization (4)
- ✅ InitializeAccount (with rent sysvar)
- ✅ InitializeAccount2 (owner in data)
- ✅ InitializeAccount3 (no rent sysvar)
- ✅ Create Associated Token Account

#### Minting (2)
- ✅ MintTo
- ✅ MintToChecked

#### Transfers (3)
- ✅ Transfer
- ✅ TransferChecked
- ✅ Transfer (by delegate)

#### Approvals (3)
- ✅ Approve
- ✅ ApproveChecked
- ✅ Revoke

#### Burning (2)
- ✅ Burn
- ✅ BurnChecked

#### Freeze/Thaw (2)
- ✅ FreezeAccount
- ✅ ThawAccount

#### Authority Management (2)
- ✅ SetAuthority (change mint authority)
- ✅ SetAuthority (disable freeze)

#### Multisig (1)
- ✅ InitializeMultisig

#### Utilities (2)
- ✅ SyncNative (wrapped SOL)
- ✅ CloseAccount

### Usage

#### Step 1: Start the RPC Server
```bash
bun run dev
```

This starts the Solana RPC server on `http://localhost:8899`

#### Step 2: Run the Test Script (in a new terminal)
```bash
bun run test:parsers
```

Or directly:
```bash
bun run scripts/test-all-parsers.ts
```

#### Step 3: View Results in Explorer

The script will output:
- ✅/❌ for each instruction tested
- Transaction signatures
- Direct links to the explorer

Open the explorer at: `http://localhost:3000`

### Example Output

```
🚀 Testing All Instruction Parsers

📡 RPC: http://localhost:8899
🔍 Explorer: http://localhost:3000

💰 Funding accounts...

📝 Test Accounts:
   Payer: 7xK8...9dPQ
   Owner: 5mN2...8rTY
   Delegate: 9pL4...3wQX

🏭 Testing Mint Initialization Instructions...

✅ InitializeMint
   Signature: 4Zx9K...8mPQ
   Explorer: http://localhost:3000/tx/4Zx9K...8mPQ

✅ InitializeMint2
   Signature: 2Hy7L...5nRW
   Explorer: http://localhost:3000/tx/2Hy7L...5nRW

...

📊 TEST SUMMARY
================================================================================

✅ Successful: 24/24
❌ Failed: 0/24

🎉 Successfully Tested Instructions:

   • InitializeMint
     http://localhost:3000/tx/4Zx9K...8mPQ
   • InitializeMint2
     http://localhost:3000/tx/2Hy7L...5nRW
   ...
```

### What to Check in the Explorer

For each transaction, verify:

1. **Instruction appears with correct type**
   - Example: "mintToChecked" instead of "unknown"

2. **All fields are populated**
   - Accounts (source, destination, authority, etc.)
   - Amounts in both raw and UI format
   - Decimals where applicable

3. **Field names match Solana Explorer**
   - Use mainnet transactions as reference
   - Compare field naming and structure

4. **Inner instructions are parsed**
   - For complex transactions with CPIs

5. **Logs are visible**
   - Program logs should be captured

### Troubleshooting

#### RPC Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:8899
```
**Solution:** Make sure the RPC server is running: `bun run dev`

#### Transaction Failed
Individual instruction failures are expected if:
- Token accounts are already closed
- Authorities have been changed
- Insufficient balance

The script handles errors gracefully and continues.

#### No Transactions in Explorer
Check that:
1. RPC server is running on port 8899
2. Explorer is accessible at http://localhost:3000
3. You're searching for the correct addresses/signatures

### Customization

You can modify the script to:

**Test specific instructions only:**
```typescript
// Comment out sections you don't want to test
// For example, skip multisig tests:
/*
console.log("👥 Testing Multisig Instructions...\n");
// ... multisig test code ...
*/
```

**Use Token-2022 instead:**
```typescript
// Change at the top of the script:
import { TOKEN_2022_PROGRAM_ID as TOKEN_PROGRAM_ID } from "@solana/spl-token";
```

**Test with different amounts:**
```typescript
// Modify amounts in the minting/transfer sections
1_000_000_000n, // 1 token -> 5_000_000_000n (5 tokens)
```

### Advanced: Testing Extensions

To test Token-2022 extensions:

```typescript
import {
  createInitializeTransferFeeConfigInstruction,
  createTransferCheckedWithFeeInstruction,
} from "@solana/spl-token";

// Add extension initialization before InitializeMint
// See Token-2022 docs for details
```

### Notes

- **Idempotent:** Not safe to run multiple times (accounts get closed)
- **Clean state:** Restart RPC server between runs if needed
- **Development only:** Uses test keypairs with airdropped SOL
- **No real value:** All transactions use test tokens

### Next Steps

After running this script:

1. **Verify all parsers work** - Check each transaction in explorer
2. **Report issues** - Note any instruction types that don't parse correctly
3. **Add extension tests** - Once Phase 2 parsers are added
4. **Create regression suite** - Save signatures for automated testing

### Related Documentation

- [parser-progress.md](../docs/parser-progress.md) - Parser coverage status
- [parser-enhancement-plan.md](../docs/parser-enhancement-plan.md) - Roadmap
- [AGENTS.md](../AGENTS.md) - Development guidelines
