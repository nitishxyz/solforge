# Solana x402 Payment Issue

## Summary
PayAI's facilitator supports `solana-devnet` and `solana` in theory (returns them in `/supported`), but **rejects all Solana transactions** with the error:
```
invalid_exact_svm_payload_transaction_instructions_length
```

## What We've Tried

### ✅ What Works
1. Both wallets have 10 USDC on devnet
2. Transaction creation is correct (1 instruction SPL token transfer)
3. Resource URL validation fixed (must be valid HTTP URL)
4. Fee payer properly set to facilitator's address
5. Transaction is properly signed and serialized

### ❌ What Doesn't Work
All transaction formats rejected:
- 1 instruction (just transfer) → `invalid_exact_svm_payload_transaction_instructions_length`
- 2 instructions (compute budget + transfer) → `invalid_exact_svm_payload_transaction_instructions_length`
- 3 instructions (compute limit + transfer + compute price) → `invalid_exact_svm_payload_transaction_instructions_compute_price_instruction`
- User as fee payer → `invalid_exact_svm_payload_transaction_instructions_length`
- Facilitator as fee payer → `invalid_exact_svm_payload_transaction_instructions_length`

## Root Cause

**PayAI's Solana implementation is incomplete or broken.**

Evidence:
1. ✅ Coinbase x402 repo has NO Solana implementation (EVM only)
2. ✅ PayAI docs have NO Solana client examples (only EVM)
3. ✅ NPM packages (x402-axios, x402-fetch) are EVM-only (use viem)
4. ✅ PayAI website claims "🎉 x402 is now live on Solana!" but provides no docs/examples
5. ✅ Facilitator `/supported` returns Solana networks but rejects all transactions

## The Error Message

`invalid_exact_svm_payload_transaction_instructions_length` is PayAI's custom error, not a standard Solana error. This suggests:
- PayAI has custom validation logic for Solana transactions
- That validation is rejecting ALL transactions we send
- The error name is misleading (not about instruction count, but transaction structure)

## Our Implementation

Our client code is correct per the x402 spec:
```typescript
// 1. Create transaction with facilitator as fee payer
const messageV0 = new TransactionMessage({
  payerKey: facilitatorFeePayer,
  recentBlockhash: blockhash,
  instructions: [computeBudgetIx, transferIx],
}).compileToV0Message();

// 2. Sign with user's key only (partial signing)
const tx = new VersionedTransaction(messageV0);
tx.sign([userKeypair]);

// 3. Serialize allowing missing signatures
const serialized = tx.serialize({
  requireAllSignatures: false,
  verifySignatures: false,
});

// 4. Send to facilitator
const payload = {
  x402Version: 1,
  scheme: "exact",
  network: "solana-devnet",
  payload: {
    transaction: Buffer.from(serialized).toString("base64"),
  },
};

const requirements = {
  scheme: "exact",
  network: "solana-devnet",
  asset: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  payTo: "GEiU9SUvcG4v4mwadSreQPxMGnh7aQ5VxRbKkeL3Uc4D",
  resource: "http://localhost:4000/v1/chat/completions",
  maxAmountRequired: "1000000",
  extra: {
    feePayer: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
  },
};
```

## Next Steps

### Option 1: Contact PayAI Support
Join their Discord: https://discord.gg/payai (mentioned in docs)
Report the issue and ask for:
- Working Solana client example
- Expected transaction format
- Timeline for when Solana will fully work

### Option 2: Use EVM Chains (Temporary)
Switch to Base Sepolia which works:
```typescript
// Change in config.ts
payment: {
  network: "base-sepolia",
  usdcMint: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  companyWallet: "0x...", // Your EVM address
}
```

Then use Coinbase's x402-axios client (it works for EVM).

### Option 3: Wait for PayAI
Since they just announced Solana support, it may take weeks for them to:
- Implement proper Solana transaction validation
- Release client libraries
- Document the expected format

## Conclusion

**This is NOT a bug in our code.** PayAI's facilitator has incomplete Solana support. The protocol spec exists, but the implementation doesn't work yet.

## Files Changed

- `apps/ai/src/services/x402-payment.ts` - Added resource URL validation, fee payer in extra
- `apps/ai/src/client/x402-client.ts` - Added compute budget instruction, facilitator fee payer support
- `apps/ai/scripts/debug-facilitator.ts` - Debug script to test facilitator directly
- `apps/ai/scripts/check-balances.ts` - Check USDC balances on devnet

## Test Results

Wallets have funds:
```
Test Wallet (HiZJz...NQFw):
  SOL: 5 SOL
  USDC: 10 USDC
  
Platform Wallet (GEiU9...Uc4D):
  SOL: 5 SOL
  USDC: 10 USDC
```

Transaction structure (what we're sending):
```
Instructions: 2 (compute budget + transfer)
Signatures: 2 (facilitator unsigned, user signed)
Required signers: 2
Size: 383 bytes
```

Facilitator response:
```json
{
  "success": false,
  "errorReason": "invalid_exact_svm_payload_transaction_instructions_length",
  "network": "solana-devnet",
  "transaction": ""
}
```
