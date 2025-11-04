# AI Proxy with x402 Payment Protocol

OpenAI & Anthropic API proxy with Solana USDC micropayments using the x402 protocol.

## Features

- 🤖 **Multi-Provider AI**: OpenAI (GPT-4, GPT-4o, GPT-3.5) & Anthropic (Claude Sonnet, Haiku, Opus)
- 💳 **x402 Payments**: Automatic USDC payments via Solana blockchain
- 🔐 **Wallet Authentication**: Solana wallet signature verification
- 💰 **Balance Management**: Track usage, topups, and transaction history
- 📊 **Cost Tracking**: Per-token pricing with configurable markup
- 🚀 **High Performance**: Built with Bun + Hono for speed

## Quick Start

### 1. Installation

```bash
cd apps/ai
bun install
```

### 2. Database Setup

```bash
# Create database
sst shell --stage dev

# Run migrations
bun run db push
```

### 3. Configure Secrets

```bash
sst secret set DatabaseUrl <your-postgres-url>
sst secret set OpenAiApiKey <your-openai-key>
sst secret set AnthropicApiKey <your-anthropic-key>
sst secret set PlatformWallet <your-solana-wallet>
```

### 4. Start Development Server

```bash
sst shell --stage dev -- bun run src/index.ts
```

Server runs on `http://localhost:4000`

## Usage

### Client Integration

```typescript
import { X402Client } from './client/x402-client';
import { useWallet } from '@solana/wallet-adapter-react';

const wallet = useWallet();
const client = new X402Client('https://api.devnet.solana.com');

// Make authenticated request
const response = await client.makeAuthenticatedRequest(
  'https://ai.solforge.sh/v1/chat/completions',
  wallet,
  async (msg) => wallet.signMessage!(msg),
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  }
);

// Auto-handle 402 payment if needed
if (response.status === 402) {
  const paid = await client.handlePaymentRequired(response, wallet, ...);
  const result = await paid.json();
}
```

### API Endpoints

#### `GET /v1/models`
List available models with pricing

#### `GET /v1/balance`
Get account balance and statistics
- Requires: Wallet auth headers

#### `POST /v1/chat/completions`
OpenAI-compatible chat completions
- Requires: Wallet auth headers, sufficient balance
- Supports: Streaming and non-streaming
- Returns: 402 if balance too low

#### `POST /v1/topup`
Top up account balance
- Requires: Wallet auth headers, x402 payment payload

#### `GET /v1/transactions`
Transaction history
- Requires: Wallet auth headers
- Query params: `limit`, `offset`

### Authentication Headers

All authenticated endpoints require:

```bash
x-wallet-address: <your-solana-public-key>
x-wallet-signature: <base58-signature-of-nonce>
x-wallet-nonce: <timestamp-in-milliseconds>
```

Example (curl):
```bash
# Generate signature with your wallet
NONCE=$(date +%s)000
SIGNATURE=$(echo -n $NONCE | solana sign-message --keypair ~/.config/solana/id.json)

curl http://localhost:4000/v1/balance \
  -H "x-wallet-address: YOUR_PUBKEY" \
  -H "x-wallet-signature: $SIGNATURE" \
  -H "x-wallet-nonce: $NONCE"
```

## Testing

### Setup Devnet Wallet

```bash
# Run setup script
./scripts/setup-devnet-wallet.sh

# Get devnet USDC from faucet
open https://faucet.circle.com/
```

### Run Tests

```bash
# Full test suite
bun run test/test-client.ts

# x402 payment integration
bun run test/x402-client-test.ts

# Payment format verification
bun run test/test-topup-format.ts
```

## x402 Payment Flow

1. **Client makes request** with low balance
2. **Server returns 402** with payment requirements:
   ```json
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "maxAmountRequired": "1000000",
       "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
       "payTo": "<platform-wallet>",
       "description": "Top-up required"
     }]
   }
   ```
3. **Client creates USDC transfer** (partially signed)
4. **Client sends payment** to `/v1/topup`
5. **Server settles via facilitator** (completes + broadcasts tx)
6. **Server credits balance**
7. **Client retries original request**

## Configuration

Edit `apps/ai/src/config.ts`:

```typescript
export const config = {
  port: 4000,
  minBalance: 0.50,          // Minimum balance in USD
  markup: 1.15,              // 15% markup on provider costs
  
  payment: {
    network: "solana-devnet", // or "solana-mainnet"
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    companyWallet: Resource.PlatformWallet.value,
  },
  
  facilitator: {
    url: "https://facilitator.payai.network"
  }
};
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

```bash
# Deploy to staging
sst deploy --stage staging

# Deploy to production
sst deploy --stage production
```

## Project Structure

```
apps/ai/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration
│   ├── client/
│   │   └── x402-client.ts    # x402 client library
│   ├── middleware/
│   │   ├── auth.ts           # Wallet authentication
│   │   ├── balance-check.ts  # Balance verification
│   │   └── error-handler.ts  # Error handling
│   ├── routes/
│   │   ├── chat.ts           # Chat completions
│   │   ├── balance.ts        # Balance endpoint
│   │   ├── topup.ts          # Payment topup
│   │   ├── transactions.ts   # Transaction history
│   │   └── models.ts         # Model listing
│   ├── providers/
│   │   ├── openai.ts         # OpenAI integration
│   │   └── anthropic.ts      # Anthropic integration
│   └── services/
│       ├── x402-payment.ts   # x402 protocol
│       ├── balance-manager.ts # Balance operations
│       └── pricing.ts        # Model pricing
├── db/
│   └── schema/               # Database schema
├── test/                     # Test files
├── scripts/                  # Utility scripts
└── README.md                 # This file
```

## Database Schema

### Users
- `walletAddress` (PK)
- `balanceUsd`
- `totalSpent`
- `totalTopups`
- `requestCount`
- `lastPayment`, `lastRequest`

### Transactions
- `id` (PK)
- `walletAddress` (FK)
- `type` (topup | deduction)
- `amountUsd`
- `provider`, `model`, `tokens`
- `balanceBefore`, `balanceAfter`

### Payment Logs
- `id` (PK)
- `walletAddress` (FK)
- `txSignature` (unique)
- `amountUsd`
- `status`, `verified`
- `facilitatorUrl`

## Pricing

Prices include 15% markup over provider costs:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-4o | $2.88 | $11.50 |
| GPT-4o-mini | $0.17 | $0.69 |
| Claude Sonnet 4.5 | $3.45 | $17.25 |
| Claude Haiku 4.5 | $0.92 | $4.60 |

View all models: `GET /v1/models`

## Security

- ✅ Wallet signature verification (60s nonce window)
- ✅ Balance checks before API calls
- ✅ Duplicate transaction prevention
- ✅ SQL injection protection (Drizzle ORM)
- ✅ Rate limiting (TODO: implement)
- ✅ Secure secret management (SST)

## Support

- **Issues**: GitHub Issues
- **Docs**: [test/README-x402.md](test/README-x402.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

## License

MIT
