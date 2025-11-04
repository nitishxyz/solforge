# x402 Payment Protocol - Implementation Guide

## Overview

This implementation provides full x402 payment support for the AI proxy using Solana USDC payments via the PayAI facilitator network.

## Architecture

### Server-Side (`apps/ai/src/services/x402-payment.ts`)
- Creates payment requirements when balance is low
- Verifies payment payloads via PayAI facilitator
- Settles transactions (facilitator completes + broadcasts)
- Credits user balances after settlement

### Client-Side (`apps/ai/src/client/x402-client.ts`)
- Detects 402 responses
- Creates SPL token transfer transactions
- Partially signs with user wallet
- Sends to server for settlement
- Retries original request after payment

## Payment Flow

```
1. Client → Server: API request with low balance
2. Server → Client: 402 Payment Required + x402 payment requirements
3. Client: Creates USDC transfer transaction (partially signed)
4. Client → Server: POST /v1/topup with payment payload
5. Server → Facilitator: POST /settle (complete transaction)
6. Facilitator → Solana: Broadcasts completed transaction
7. Facilitator → Server: Transaction signature
8. Server: Credits balance, stores transaction
9. Server → Client: 200 OK with new balance
10. Client → Server: Retry original request
11. Server → Client: 200 OK with API response
```

## Testing

### Prerequisites

1. **Devnet SOL** (for transaction fees):
   ```bash
   solana airdrop 2 HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw --url devnet
   ```

2. **Devnet USDC**:
   - Visit https://faucet.circle.com/
   - Or use SPL token faucet: https://spl-token-faucet.com/
   - Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

3. **Associated Token Account**:
   ```bash
   spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
     --owner HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw \
     --url devnet
   ```

### Test Scripts

**Manual Payment Creation**:
```bash
cd apps/ai
bun run test/x402-client-test.ts
```

**Full Integration Test** (requires USDC balance):
```bash
# This will:
# 1. Make a request with low balance
# 2. Get 402 response
# 3. Automatically create USDC payment
# 4. Send to facilitator for settlement
# 5. Retry original request
cd apps/ai
bun run test/x402-client-test.ts
```

**Check USDC Balance**:
```bash
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  --owner HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw \
  --url devnet
```

## Configuration

### Network Selection

Edit `apps/ai/src/config.ts`:
```typescript
const IS_DEVNET = true; // false for mainnet

export const config = {
  payment: {
    network: IS_DEVNET ? "solana-devnet" : "solana-mainnet",
    usdcMint: IS_DEVNET 
      ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  // Devnet
      : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet
  }
}
```

### Platform Wallet

Set your receiving wallet address:
```bash
sst secret set PlatformWallet <YOUR_WALLET_ADDRESS> --stage production
```

## Client Integration Examples

### React + Wallet Adapter

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { X402Client } from './x402-client';

function ChatComponent() {
  const wallet = useWallet();
  const client = new X402Client('https://api.devnet.solana.com');

  async function sendMessage(message: string) {
    const response = await client.makeAuthenticatedRequest(
      'https://ai.solforge.sh/v1/chat/completions',
      wallet,
      async (msg) => {
        if (!wallet.signMessage) throw new Error('Wallet does not support signing');
        return wallet.signMessage(msg);
      },
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: message }]
        })
      }
    );

    // Auto-handle 402 payment
    const finalResponse = response.status === 402
      ? await client.handlePaymentRequired(response, wallet, ...)
      : response;

    return finalResponse.json();
  }
}
```

### Node.js / CLI

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client, signMessageWithKeypair } from './x402-client';

const keypair = Keypair.fromSecretKey(...);
const wallet = new SimpleWalletAdapter(keypair);
const client = new X402Client('https://api.devnet.solana.com');

const response = await client.makeAuthenticatedRequest(
  'https://ai.solforge.sh/v1/chat/completions',
  wallet,
  (msg) => signMessageWithKeypair(keypair, msg),
  { method: 'POST', ... }
);

if (response.status === 402) {
  const paid = await client.handlePaymentRequired(response, wallet, ...);
  // Use paid response
}
```

## Mainnet Deployment Checklist

- [ ] Test on devnet with real USDC transfers
- [ ] Verify facilitator integration
- [ ] Set `IS_DEVNET = false` in config
- [ ] Update USDC mint to mainnet
- [ ] Set platform wallet address
- [ ] Test with small mainnet amount first
- [ ] Monitor transaction confirmations
- [ ] Set up transaction failure alerts
- [ ] Document fee structure for users
- [ ] Add retry logic for failed payments
- [ ] Implement refund mechanism
- [ ] Add transaction history UI

## Security Notes

1. **Never commit private keys** - test wallet key is for devnet testing only
2. **Verify payment amounts** - client should always show amount before signing
3. **Check associated token accounts** - ensure receiver ATA exists
4. **Monitor facilitator health** - have backup payment methods
5. **Rate limit topup endpoint** - prevent spam
6. **Validate transaction signatures** - verify payer matches wallet
7. **Idempotency** - prevent duplicate transaction processing

## Troubleshooting

**Error: "Cannot find associated token account"**
- Create ATA: `spl-token create-account <MINT> --owner <WALLET>`

**Error: "Insufficient USDC balance"**
- Get devnet USDC from faucet

**Error: "Facilitator settle failed"**
- Check network (devnet vs mainnet)
- Verify transaction is properly signed
- Check facilitator service status

**Error: "Transaction already processed"**
- Server prevents duplicate payments
- Check `/v1/transactions` for history

## Resources

- [PayAI Facilitator Docs](https://docs.payai.network)
- [x402 Protocol Spec](https://github.com/payai/x402)
- [SPL Token Guide](https://spl.solana.com/token)
- [Circle USDC](https://www.circle.com/en/usdc)
