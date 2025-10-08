# Testing Parser Implementation

This guide shows how to test the instruction parsers we've built.

## Quick Start

### 1. Start RPC Server
```bash
bun run dev:cli
```

This starts the local Solana RPC server on `http://localhost:8899`

### 2. Run Parser Test Script (in new terminal)
```bash
bun run test:parsers
```

This will:
- Create 24 different transaction types
- Print results with explorer links
- Show a summary of success/failures

### 3. View in Explorer

Open `http://localhost:3000` and search for the transaction signatures or addresses from the script output.

## What Gets Tested

The script tests the instruction parsers we've implemented:

### ✅ Core Instructions (23 tested)

| Category | Instructions |
|----------|-------------|
| **Mint Init** | InitializeMint, InitializeMint2 |
| **Account Init** | InitializeAccount, InitializeAccount2, InitializeAccount3, Create ATA |
| **Minting** | MintTo, MintToChecked |
| **Transfers** | Transfer, TransferChecked, Transfer (by delegate) |
| **Approvals** | Approve, ApproveChecked, Revoke |
| **Burning** | Burn, BurnChecked |
| **Freeze/Thaw** | FreezeAccount, ThawAccount |
| **Authority** | SetAuthority (2 variants) |
| **Multisig** | InitializeMultisig, InitializeMultisig2 |
| **Utilities** | SyncNative, CloseAccount |

### 📋 Instructions Not in Test Script (but parsers exist)

- **InitializeImmutableOwner** - Rarely used standalone
- **Reallocate** - Extension-specific
- **AmountToUiAmount** - Conversion utility
- **UiAmountToAmount** - Conversion utility
- **InitializeMintCloseAuthority** - Extension-specific
- **InitializePermanentDelegate** - Extension-specific
- **InitializeNonTransferableMint** - Extension-specific

These can be manually tested or added to the script as needed.

## Expected Output

### Success Example
```
🚀 Testing All Instruction Parsers

📡 RPC: http://localhost:8899
🔍 Explorer: http://localhost:3000

💰 Funding accounts...

📝 Test Accounts:
   Payer: 7xK8DqP9...
   Owner: 5mN2rTY8...
   Delegate: 9pL43wQX...

🏭 Testing Mint Initialization Instructions...

✅ InitializeMint
   Signature: 4Zx9K8mPQ...
   Explorer: http://localhost:3000/tx/4Zx9K8mPQ...

✅ InitializeMint2
   Signature: 2Hy7L5nRW...
   Explorer: http://localhost:3000/tx/2Hy7L5nRW...

...

📊 TEST SUMMARY
================================================================================

✅ Successful: 24/24
❌ Failed: 0/24

🎉 Successfully Tested Instructions:
   • InitializeMint (http://localhost:3000/tx/...)
   • InitializeMint2 (http://localhost:3000/tx/...)
   ...
```

## Verifying in Explorer

For each transaction, check:

### 1. Instruction Type Is Recognized
- ✅ Should show: `"mintToChecked"`
- ❌ Should NOT show: `"unknown"` or raw data

### 2. Fields Are Populated
Example for `MintToChecked`:
```json
{
  "type": "mintToChecked",
  "info": {
    "account": "...",
    "mint": "...",
    "mintAuthority": "...",
    "tokenAmount": {
      "amount": "1000000000",
      "decimals": 9,
      "uiAmount": 1.0,
      "uiAmountString": "1"
    }
  }
}
```

### 3. Field Names Match Mainnet
Compare with https://explorer.solana.com to ensure compatibility.

### 4. All Accounts Are Listed
- Source, destination, authority, etc.
- Should have addresses, not just indices

## Troubleshooting

### RPC Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:8899
```
**Fix:** Make sure RPC server is running: `bun run dev:cli`

### Explorer Not Loading
**Fix:** Check that the explorer is running (usually starts with RPC server)

### Some Tests Fail
This is expected if:
- Accounts already closed
- Authorities changed
- State conflicts

The script continues and shows which ones succeeded.

### Want to Re-run
Restart the RPC server to get a clean slate:
```bash
# Stop with Ctrl+C
bun run dev:cli
```

Then re-run the test script.

## Manual Testing

You can also test parsers manually:

### Using curl
```bash
# Get a transaction
curl -X POST http://localhost:8899 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": [
      "SIGNATURE_HERE",
      { "encoding": "jsonParsed" }
    ]
  }'
```

### Using @solana/web3.js
```typescript
import { Connection } from "@solana/web3.js";

const connection = new Connection("http://localhost:8899");
const tx = await connection.getParsedTransaction("SIGNATURE_HERE");
console.log(JSON.stringify(tx, null, 2));
```

## Writing Custom Tests

Create a new script in `scripts/`:

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { createMintToInstruction } from "@solana/spl-token";

const connection = new Connection("http://localhost:8899");

// Your test logic here
```

Run with:
```bash
bun run scripts/your-test.ts
```

## Next: Extension Testing

Once Phase 2 parsers are added, we'll extend this script to test:
- Transfer Fee instructions
- Interest Bearing instructions
- Confidential Transfer instructions
- etc.

## Coverage Metrics

**Current:** 30/45 core Token-2022 instructions (67%)

After Phase 2: ~80% coverage (including extensions)

## Related Documentation

- [scripts/README.md](./scripts/README.md) - Detailed script documentation
- [docs/parser-progress.md](./docs/parser-progress.md) - Parser status
- [docs/parser-enhancement-plan.md](./docs/parser-enhancement-plan.md) - Roadmap

---

**Last Updated:** January 2025  
**Script:** [`scripts/test-all-parsers.ts`](./scripts/test-all-parsers.ts)
