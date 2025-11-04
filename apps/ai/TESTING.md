# Testing Guide

## Quick Test Commands

```bash
# Reset database (fresh start)
bun run reset

# Run basic tests
bun run test

# Test x402 client library
bun run test:x402

# Full integration test (requires USDC)
bun run test:full
```

## Setup for Real Payment Testing

### 1. Reset Database
```bash
cd apps/ai
bun run reset
```

### 2. Setup Devnet Wallet
```bash
./scripts/setup-devnet-wallet.sh
```

This will:
- Set Solana CLI to devnet
- Airdrop 2 SOL for transaction fees
- Create USDC Associated Token Account
- Show current USDC balance

### 3. Get Devnet USDC

**Option A: Circle Faucet** (Recommended)
- Visit: https://faucet.circle.com/
- Enter wallet: `HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw`
- Request USDC

**Option B: SPL Token Faucet**
- Visit: https://spl-token-faucet.com/
- Select USDC token
- Enter wallet address

**Verify USDC Balance:**
```bash
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --owner HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw \
  --url devnet
```

### 4. Run Full Integration Test
```bash
bun run test:full
```

Expected flow:
1. ✅ Checks balance (should be $0.00)
2. ✅ Makes chat request → gets 402 Payment Required
3. ✅ Creates USDC payment transaction
4. ✅ Sends to facilitator for settlement
5. ✅ Facilitator completes + broadcasts transaction
6. ✅ Server credits balance ($1.00)
7. ✅ Retries chat request → gets AI response
8. ✅ Shows updated balance and transaction history

## Test Wallet Details

**Public Key:** `HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw`  
**Network:** Solana Devnet  
**USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

⚠️ **Private key is in test files - NEVER use this wallet on mainnet!**

## Manual Testing

### Check Balance
```bash
curl http://localhost:4000/v1/balance \
  -H "x-wallet-address: HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw" \
  -H "x-wallet-signature: <SIGNATURE>" \
  -H "x-wallet-nonce: <TIMESTAMP>"
```

### Trigger 402 Payment Required
```bash
# With fresh database (balance = 0)
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw" \
  -H "x-wallet-signature: <SIGNATURE>" \
  -H "x-wallet-nonce: <TIMESTAMP>" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Expected: 402 with x402Version and accepts array
```

### View Transaction History
```bash
curl http://localhost:4000/v1/transactions \
  -H "x-wallet-address: HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw" \
  -H "x-wallet-signature: <SIGNATURE>" \
  -H "x-wallet-nonce: <TIMESTAMP>"
```

## Troubleshooting

### "Missing payment payload" error
- ✅ This is expected! Old format no longer works
- ✅ Use x402 client library to create proper payment

### "Payment verification failed"
- Check you have USDC in wallet
- Verify network is devnet
- Check USDC ATA exists
- View facilitator error in server logs

### "Transaction already processed"
- Transaction signatures must be unique
- Each payment creates a new transaction
- Check payment_logs table for duplicates

### Server not running
```bash
# Start server
cd apps/ai
sst shell --stage bat -- bun run src/index.ts

# Or use terminal that's already running
```

## Next Steps After Testing

Once you have USDC and can complete a full payment test:

1. ✅ Verify transaction on Solana Explorer (devnet)
2. ✅ Check balance was credited correctly
3. ✅ Verify API request succeeded after payment
4. ✅ Test multiple payments in sequence
5. ✅ Test insufficient USDC scenario
6. 📝 Document any issues found
7. 🚀 Prepare for mainnet deployment

## Mainnet Readiness

Before deploying to mainnet:
- [ ] Complete all devnet tests successfully
- [ ] Test with multiple wallets
- [ ] Test error scenarios (insufficient funds, network errors)
- [ ] Review facilitator fees
- [ ] Set up monitoring & alerts
- [ ] Create runbook for payment failures
- [ ] Document refund process
- [ ] Update config: `IS_DEVNET = false`
- [ ] Change USDC mint to mainnet
- [ ] Test with small mainnet amount first

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.
