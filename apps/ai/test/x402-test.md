# x402 Payment Integration Test

## Setup

1. **Get Devnet USDC**:
   ```bash
   # Airdrop devnet SOL first
   solana airdrop 2 HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw --url devnet
   
   # Then get devnet USDC from faucet
   # Visit: https://faucet.circle.com/
   # Or use SPL token faucet
   ```

2. **Test Wallet**:
   - Public: `HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw`
   - Private: `4HVvY6VJDPySX1RTmiCm1aWQVRu3sPYf4qex68VvbRP8hoLGUAWWdVLQx4gnsQf4QFe7pYAQz4VGWX9pEjFJzFkh`

## Test Flow

### 1. Request with Low Balance → Get 402

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw" \
  -H "x-wallet-signature: SIGNATURE" \
  -H "x-wallet-nonce: $(date +%s)000" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'
```

**Expected Response (402):**
```json
{
  "x402Version": 1,
  "error": {
    "message": "Balance too low. Please top up.",
    "type": "insufficient_balance",
    "current_balance": "0.00",
    "minimum_balance": "0.50"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "solana-devnet",
    "maxAmountRequired": "1000000",
    "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "payTo": "YOUR_PLATFORM_WALLET",
    "resource": "https://ai.solforge.sh/v1/chat/completions",
    "description": "Top-up required for API access"
  }]
}
```

### 2. Client Creates Payment (x402 client library would do this)

Client needs to:
1. Create SPL token transfer instruction (1 USDC to platform wallet)
2. Partially sign transaction
3. Base64 encode it
4. Send in X-PAYMENT header

### 3. Server Verifies & Settles Payment

Server automatically:
1. Calls `POST https://facilitator.payai.network/settle`
2. Facilitator completes transaction (adds feePayer signature)
3. Broadcasts to Solana
4. Returns tx signature
5. Credits user balance

## Implementation Status

✅ **Completed:**
- x402 payment requirement generation
- PayAI facilitator integration
- Real transaction verification via facilitator
- Duplicate transaction prevention
- Balance crediting after settlement

❌ **TODO:**
- Client-side x402 implementation (wallet signing)
- Test with real devnet USDC transfers
- Mainnet deployment checklist

## USDC Mints

- **Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Mainnet**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Notes

- PayAI facilitator handles:
  - Transaction verification
  - Fee payment (gas)
  - Transaction broadcasting
  
- Our server handles:
  - Payment requirements generation
  - Balance management
  - Duplicate prevention
  - Cost tracking
