# ai.solforge.sh - AI API Proxy with x402 Payments

**Version:** 1.0  
**Date:** October 26, 2025  
**Status:** Planning

---

## Executive Summary

Build an AI API proxy service that enables users to access premium AI models (OpenAI, Anthropic) using Solana wallet payments via the x402 protocol. The service eliminates API key management, provides transparent usage-based billing, and maintains full compatibility with Vercel AI SDK.

**Key Innovation:** Hybrid payment model combining x402 top-ups with usage-based deductions.

---

## Core Architecture

### High-Level Flow

```
User Request
    ↓
Wallet Auth (Signature Verification)
    ↓
Balance Check (PostgreSQL)
    ↓
[Balance < $0.50?] → Yes → x402 Top-up ($1-5) → Update Balance
    ↓ No
Process LLM Request (OpenAI/Anthropic)
    ↓
Calculate Actual Cost (tokens × rate × markup)
    ↓
Deduct from Balance (PostgreSQL)
    ↓
Return Response + Remaining Balance
```

### Why Hybrid Model?

**Problem:** x402 charges fixed amounts per request, but LLM costs vary wildly:
- 10 tokens (GPT-3.5): $0.0001
- 10,000 tokens (GPT-4): $0.60

**Solution:** Two-tier system:
1. **x402 handles top-ups** (fixed: $1, $5, $10)
2. **Internal ledger handles usage** (variable: actual token cost)

This prevents overpaying/underpaying while maintaining instant crypto payments.

---

## Technology Stack

### Backend Framework
- **Bun** - Runtime and package manager
- **Hono** - Ultra-fast web framework with native x402 support
- **x402-hono** - Payment middleware for Solana

### Database
- **PostgreSQL** - Production-grade user data and transactions
- **Drizzle ORM** - Type-safe database access

### AI Providers
- **@ai-sdk/openai** - OpenAI integration
- **@ai-sdk/anthropic** - Anthropic integration

### Blockchain
- **@solana/web3.js** - Wallet management and verification
- **x402 Protocol** - Instant stablecoin payments

### Core Dependencies

```json
{
  "hono": "^latest",
  "x402-hono": "^latest",
  "@ai-sdk/openai": "^latest",
  "@ai-sdk/anthropic": "^latest",
  "@solana/web3.js": "^1.98.4",
  "drizzle-orm": "^0.44.5",
  "postgres": "^3.4.0",
  "viem": "^latest"
}
```

---

## Database Schema (Drizzle ORM)

### Users Table

```typescript
export const users = pgTable('users', {
  walletAddress: text('wallet_address').primaryKey(),
  balanceUsd: numeric('balance_usd', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalTopups: numeric('total_topups', { precision: 10, scale: 2 }).notNull().default('0.00'),
  requestCount: integer('request_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastPayment: timestamp('last_payment'),
  lastRequest: timestamp('last_request'),
});
```

### Transactions Table

```typescript
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull().references(() => users.walletAddress),
  type: text('type', { enum: ['topup', 'deduction'] }).notNull(),
  amountUsd: numeric('amount_usd', { precision: 10, scale: 4 }).notNull(),
  
  // For top-ups
  txSignature: text('tx_signature'),
  topupAmount: numeric('topup_amount', { precision: 10, scale: 2 }),
  
  // For deductions
  provider: text('provider'), // 'openai' | 'anthropic'
  model: text('model'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  
  balanceBefore: numeric('balance_before', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const transactionsIndex = index('tx_wallet_idx').on(transactions.walletAddress);
export const transactionsTypeIndex = index('tx_type_idx').on(transactions.type);
export const transactionsCreatedAtIndex = index('tx_created_at_idx').on(transactions.createdAt);
```

### Indexes for Performance

```typescript
// Fast balance lookups
CREATE INDEX idx_users_wallet ON users(wallet_address);

// Transaction history queries
CREATE INDEX idx_tx_wallet_created ON transactions(wallet_address, created_at DESC);
CREATE INDEX idx_tx_type ON transactions(type);

// Analytics queries
CREATE INDEX idx_tx_provider_model ON transactions(provider, model) WHERE type = 'deduction';
```

---

## API Design

### Base URL
```
https://ai.solforge.sh
```

### Authentication
All requests require Solana wallet signature in headers:

```typescript
headers: {
  'x-wallet-address': 'wallet_public_key',
  'x-wallet-signature': 'signed_message',
  'x-wallet-nonce': 'timestamp_or_random'
}
```

### Endpoints

#### 1. Chat Completions (OpenAI Compatible)

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4" | "gpt-3.5-turbo" | "claude-3-opus-20240229" | "claude-3-5-sonnet-20241022",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response (Success):**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "gpt-4",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

**Custom Headers:**
```
x-balance-remaining: 4.23
x-cost-usd: 0.002
```

**Response (402 Payment Required - Low Balance):**
```json
{
  "error": {
    "message": "Balance too low. Please top up.",
    "type": "insufficient_balance",
    "current_balance": "0.42",
    "minimum_balance": "0.50",
    "topup_required": true
  }
}
```

**Headers (x402 Protocol):**
```
HTTP 402 Payment Required
x-payment-destination: <company_wallet_address>
x-payment-amount: 1000000  (1 USDC in smallest units)
x-payment-network: solana-mainnet
x-facilitator-url: https://facilitator.payai.network
```

#### 2. Stream Completions

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [...],
  "stream": true
}
```

**Response:**
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" there"}}]}

data: [DONE]
```

#### 3. List Models

```http
GET /v1/models
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "owned_by": "openai",
      "pricing": {
        "input": "$0.03 / 1K tokens",
        "output": "$0.06 / 1K tokens"
      }
    },
    {
      "id": "claude-3-5-sonnet-20241022",
      "object": "model",
      "owned_by": "anthropic",
      "pricing": {
        "input": "$0.003 / 1K tokens",
        "output": "$0.015 / 1K tokens"
      }
    }
  ]
}
```

#### 4. Check Balance

```http
GET /v1/balance
x-wallet-address: <wallet>
x-wallet-signature: <signature>
```

**Response:**
```json
{
  "wallet_address": "ABC...XYZ",
  "balance_usd": "4.23",
  "total_spent": "15.77",
  "total_topups": "20.00",
  "request_count": 142,
  "last_payment": "2025-10-26T10:30:00Z",
  "last_request": "2025-10-26T11:15:00Z"
}
```

#### 5. Transaction History

```http
GET /v1/transactions?limit=50&offset=0
x-wallet-address: <wallet>
x-wallet-signature: <signature>
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "topup",
      "amount_usd": "5.00",
      "tx_signature": "solana_tx_hash",
      "balance_after": "9.23",
      "created_at": "2025-10-26T10:30:00Z"
    },
    {
      "id": "uuid",
      "type": "deduction",
      "amount_usd": "0.045",
      "provider": "openai",
      "model": "gpt-4",
      "input_tokens": 500,
      "output_tokens": 1000,
      "balance_after": "9.185",
      "created_at": "2025-10-26T10:31:00Z"
    }
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

---

## Payment Flow Implementation

### 1. Wallet Authentication Middleware

```typescript
// src/middleware/auth.ts
import { MiddlewareHandler } from 'hono';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export const walletAuth: MiddlewareHandler = async (c, next) => {
  const walletAddress = c.req.header('x-wallet-address');
  const signature = c.req.header('x-wallet-signature');
  const nonce = c.req.header('x-wallet-nonce');
  
  if (!walletAddress || !signature || !nonce) {
    return c.json({ error: 'Missing authentication headers' }, 401);
  }
  
  // Verify signature
  const publicKey = bs58.decode(walletAddress);
  const signatureBytes = bs58.decode(signature);
  const messageBytes = new TextEncoder().encode(nonce);
  
  const verified = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKey
  );
  
  if (!verified) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  // Check nonce freshness (prevent replay attacks)
  const nonceTime = parseInt(nonce);
  const now = Date.now();
  if (Math.abs(now - nonceTime) > 60000) { // 1 minute window
    return c.json({ error: 'Nonce expired' }, 401);
  }
  
  c.set('walletAddress', walletAddress);
  await next();
};
```

### 2. Balance Check Middleware

```typescript
// src/middleware/balance-check.ts
import { MiddlewareHandler } from 'hono';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const MIN_BALANCE = 0.50;

export const balanceCheck: MiddlewareHandler = async (c, next) => {
  const walletAddress = c.get('walletAddress');
  
  // Get or create user
  let user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress)
  });
  
  if (!user) {
    user = await db.insert(users).values({
      walletAddress,
      balanceUsd: '0.00'
    }).returning();
  }
  
  const balance = parseFloat(user.balanceUsd);
  
  if (balance < MIN_BALANCE) {
    // Trigger x402 payment
    return c.json({
      error: {
        message: 'Balance too low. Please top up.',
        type: 'insufficient_balance',
        current_balance: balance.toFixed(2),
        minimum_balance: MIN_BALANCE.toFixed(2),
        topup_required: true
      }
    }, 402, {
      'x-payment-destination': COMPANY_WALLET_ADDRESS,
      'x-payment-amount': '1000000', // 1 USDC
      'x-payment-network': 'solana-mainnet',
      'x-facilitator-url': 'https://facilitator.payai.network'
    });
  }
  
  c.set('user', user);
  await next();
};
```

### 3. x402 Top-up Handler

```typescript
// src/routes/topup.ts
import { Hono } from 'hono';
import { paymentMiddleware } from 'x402-hono';
import { db } from '../db/client';
import { users, transactions } from '../db/schema';

const topup = new Hono();

// x402 payment endpoint
topup.post('/topup/:amount',
  paymentMiddleware(COMPANY_WALLET_ADDRESS, {
    '/topup/1': { price: '$1.00', network: 'solana-mainnet' },
    '/topup/5': { price: '$5.00', network: 'solana-mainnet' },
    '/topup/10': { price: '$10.00', network: 'solana-mainnet' },
  }, {
    url: 'https://facilitator.payai.network'
  }),
  async (c) => {
    const walletAddress = c.get('walletAddress');
    const amount = parseFloat(c.req.param('amount'));
    
    // Get payment proof from x402 headers
    const txSignature = c.req.header('x-payment-tx');
    
    // Update user balance
    await db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress)
      });
      
      const oldBalance = parseFloat(user.balanceUsd);
      const newBalance = oldBalance + amount;
      
      // Update balance
      await tx.update(users)
        .set({
          balanceUsd: newBalance.toFixed(2),
          totalTopups: (parseFloat(user.totalTopups) + amount).toFixed(2),
          lastPayment: new Date()
        })
        .where(eq(users.walletAddress, walletAddress));
      
      // Record transaction
      await tx.insert(transactions).values({
        walletAddress,
        type: 'topup',
        amountUsd: amount.toFixed(2),
        txSignature,
        topupAmount: amount.toFixed(2),
        balanceBefore: oldBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2)
      });
    });
    
    return c.json({
      success: true,
      amount,
      new_balance: newBalance.toFixed(2)
    });
  }
);
```

### 4. Cost Calculation Service

```typescript
// src/services/cost-calculator.ts

export interface PricingRate {
  input: number;  // USD per 1K tokens
  output: number; // USD per 1K tokens
}

export const PRICING: Record<string, PricingRate> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

const MARKUP = 1.15; // 15% markup

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function calculateCost(model: string, usage: TokenUsage): number {
  const rate = PRICING[model];
  
  if (!rate) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const inputCost = (usage.inputTokens / 1000) * rate.input;
  const outputCost = (usage.outputTokens / 1000) * rate.output;
  
  return (inputCost + outputCost) * MARKUP;
}
```

### 5. Cost Deduction Service

```typescript
// src/services/balance-manager.ts
import { db } from '../db/client';
import { users, transactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { calculateCost, TokenUsage } from './cost-calculator';

export async function deductCost(
  walletAddress: string,
  provider: string,
  model: string,
  usage: TokenUsage
): Promise<{ cost: number; newBalance: number }> {
  const cost = calculateCost(model, usage);
  
  const result = await db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress)
    });
    
    const oldBalance = parseFloat(user.balanceUsd);
    const newBalance = oldBalance - cost;
    
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }
    
    // Update user
    await tx.update(users)
      .set({
        balanceUsd: newBalance.toFixed(4),
        totalSpent: (parseFloat(user.totalSpent) + cost).toFixed(4),
        requestCount: user.requestCount + 1,
        lastRequest: new Date()
      })
      .where(eq(users.walletAddress, walletAddress));
    
    // Record transaction
    await tx.insert(transactions).values({
      walletAddress,
      type: 'deduction',
      amountUsd: cost.toFixed(4),
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      balanceBefore: oldBalance.toFixed(4),
      balanceAfter: newBalance.toFixed(4)
    });
    
    return { cost, newBalance };
  });
  
  return result;
}
```

---

## LLM Provider Integration

### OpenAI Proxy

```typescript
// src/providers/openai.ts
import OpenAI from 'openai';
import { deductCost } from '../services/balance-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function handleOpenAI(
  walletAddress: string,
  body: any,
  stream: boolean
) {
  if (stream) {
    const completion = await openai.chat.completions.create({
      ...body,
      stream: true
    });
    
    return { stream: completion, type: 'stream' };
  } else {
    const completion = await openai.chat.completions.create(body);
    
    // Deduct cost
    const { cost, newBalance } = await deductCost(
      walletAddress,
      'openai',
      body.model,
      {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      }
    );
    
    return {
      response: completion,
      cost,
      newBalance,
      type: 'complete'
    };
  }
}
```

### Anthropic Proxy

```typescript
// src/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { deductCost } from '../services/balance-manager';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function handleAnthropic(
  walletAddress: string,
  body: any,
  stream: boolean
) {
  // Convert OpenAI format to Anthropic format
  const messages = body.messages.filter(m => m.role !== 'system');
  const systemMessage = body.messages.find(m => m.role === 'system')?.content;
  
  const anthropicBody = {
    model: body.model,
    max_tokens: body.max_tokens || 1024,
    messages,
    system: systemMessage,
    temperature: body.temperature,
    stream
  };
  
  if (stream) {
    const completion = await anthropic.messages.create(anthropicBody);
    return { stream: completion, type: 'stream' };
  } else {
    const completion = await anthropic.messages.create(anthropicBody);
    
    // Deduct cost
    const { cost, newBalance } = await deductCost(
      walletAddress,
      'anthropic',
      body.model,
      {
        inputTokens: completion.usage.input_tokens,
        outputTokens: completion.usage.output_tokens,
        totalTokens: completion.usage.input_tokens + completion.usage.output_tokens
      }
    );
    
    // Convert Anthropic response to OpenAI format
    const openAIResponse = {
      id: completion.id,
      object: 'chat.completion',
      model: completion.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: completion.content[0].text
        },
        finish_reason: completion.stop_reason
      }],
      usage: {
        prompt_tokens: completion.usage.input_tokens,
        completion_tokens: completion.usage.output_tokens,
        total_tokens: completion.usage.input_tokens + completion.usage.output_tokens
      }
    };
    
    return {
      response: openAIResponse,
      cost,
      newBalance,
      type: 'complete'
    };
  }
}
```

---

## Project Structure

```
apps/ai-proxy/
├── src/
│   ├── index.ts                  # Hono app entry point
│   ├── config.ts                 # Environment config
│   │
│   ├── middleware/
│   │   ├── auth.ts               # Wallet signature verification
│   │   ├── balance-check.ts      # Pre-request balance check
│   │   └── error-handler.ts      # Global error handling
│   │
│   ├── routes/
│   │   ├── chat.ts               # POST /v1/chat/completions
│   │   ├── models.ts             # GET /v1/models
│   │   ├── balance.ts            # GET /v1/balance
│   │   ├── transactions.ts       # GET /v1/transactions
│   │   └── topup.ts              # POST /v1/topup/:amount
│   │
│   ├── providers/
│   │   ├── openai.ts             # OpenAI integration
│   │   ├── anthropic.ts          # Anthropic integration
│   │   └── router.ts             # Route to correct provider
│   │
│   ├── services/
│   │   ├── cost-calculator.ts    # Token → USD calculation
│   │   ├── balance-manager.ts    # Balance updates & deductions
│   │   └── stream-handler.ts     # Streaming response handler
│   │
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (users, transactions)
│   │   ├── client.ts             # PostgreSQL connection
│   │   └── migrations/           # Database migrations
│   │
│   └── types.ts                  # Shared TypeScript types
│
├── drizzle.config.ts             # Drizzle ORM config
├── package.json
├── tsconfig.json
└── README.md
```

---

## Vercel AI SDK Integration

### Client-Side Usage

```typescript
// Example: Using ai.solforge.sh with Vercel AI SDK
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

// Create wallet signature for auth
function generateSignature(wallet: any): string {
  const nonce = Date.now().toString();
  const message = new TextEncoder().encode(nonce);
  const signature = nacl.sign.detached(message, wallet.secretKey);
  return bs58.encode(signature);
}

// Create custom provider
const aisolforge = createOpenAI({
  baseURL: 'https://ai.solforge.sh/v1',
  apiKey: 'not-needed', // We use wallet signatures
  fetch: (url, options) => {
    // Inject wallet auth headers
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'x-wallet-address': wallet.publicKey.toBase58(),
        'x-wallet-signature': generateSignature(wallet),
        'x-wallet-nonce': Date.now().toString()
      }
    });
  }
});

// Use with AI SDK
const result = await streamText({
  model: aisolforge('gpt-4'),
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Explain quantum computing' }
  ]
});

// Stream response
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Check remaining balance from headers
console.log('Balance:', result.response.headers.get('x-balance-remaining'));
```

### Custom Provider Package (Optional)

```typescript
// @ai-solforge/provider package
import { createOpenAI } from '@ai-sdk/openai';

export interface AISolForgeConfig {
  wallet: {
    publicKey: string;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  };
  baseURL?: string;
}

export function createAISolForge(config: AISolForgeConfig) {
  const baseURL = config.baseURL || 'https://ai.solforge.sh/v1';
  
  return createOpenAI({
    baseURL,
    apiKey: 'wallet-auth',
    fetch: async (url, options) => {
      const nonce = Date.now().toString();
      const message = new TextEncoder().encode(nonce);
      const signature = await config.wallet.signMessage(message);
      
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'x-wallet-address': config.wallet.publicKey,
          'x-wallet-signature': Buffer.from(signature).toString('base64'),
          'x-wallet-nonce': nonce
        }
      });
    }
  });
}

// Usage
import { createAISolForge } from '@ai-solforge/provider';
import { streamText } from 'ai';

const provider = createAISolForge({
  wallet: phantomWallet
});

const result = await streamText({
  model: provider('gpt-4'),
  prompt: 'Hello!'
});
```

---

## Configuration & Environment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aiproxy

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Solana
COMPANY_WALLET_ADDRESS=<your_solana_wallet>
SOLANA_NETWORK=mainnet-beta  # or devnet for testing

# x402
FACILITATOR_URL=https://facilitator.payai.network

# Server
PORT=4000
NODE_ENV=production

# Pricing
MIN_BALANCE=0.50
MARKUP_PERCENTAGE=15
```

### Supported Models (Curated List)

```typescript
export const SUPPORTED_MODELS = {
  openai: [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-opus-20240229',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ]
};
```

---

## Security Considerations

### 1. Wallet Signature Verification
- Every request must include valid Solana wallet signature
- Nonce prevents replay attacks (60-second window)
- Public key verification using nacl/tweetnacl

### 2. Rate Limiting
```typescript
// Per wallet: 100 requests/minute
// Per IP: 1000 requests/minute
import { rateLimiter } from 'hono-rate-limiter';

app.use(rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator: (c) => c.get('walletAddress')
}));
```

### 3. Database Security
- PostgreSQL with SSL required
- Prepared statements via Drizzle ORM (SQL injection protection)
- Row-level security for user isolation

### 4. API Key Protection
- Provider API keys stored in environment variables
- Never exposed to clients
- Rotated regularly

### 5. Balance Protection
- Atomic transactions prevent race conditions
- Balance checks before AND after requests
- Transaction logs for audit trail

---

## Monitoring & Analytics

### Key Metrics

```typescript
// Track in PostgreSQL or separate analytics DB
interface Metrics {
  totalUsers: number;
  activeUsers24h: number;
  totalRevenue: number;
  totalRequests: number;
  avgCostPerRequest: number;
  topModels: { model: string; count: number }[];
  errorRate: number;
}
```

### Queries for Analytics

```sql
-- Daily revenue
SELECT DATE(created_at), SUM(amount_usd)
FROM transactions
WHERE type = 'topup'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Most popular models
SELECT model, COUNT(*), SUM(amount_usd)
FROM transactions
WHERE type = 'deduction'
GROUP BY model
ORDER BY COUNT(*) DESC;

-- Average cost per model
SELECT model, AVG(amount_usd), AVG(total_tokens)
FROM transactions
WHERE type = 'deduction'
GROUP BY model;

-- User retention
SELECT 
  COUNT(DISTINCT wallet_address) as total_users,
  COUNT(DISTINCT CASE WHEN last_request > NOW() - INTERVAL '24 hours' THEN wallet_address END) as active_24h,
  COUNT(DISTINCT CASE WHEN last_request > NOW() - INTERVAL '7 days' THEN wallet_address END) as active_7d
FROM users;
```

---

## Pricing Strategy

### Top-up Tiers
- **$1.00** - Quick test (100-200 GPT-3.5 requests)
- **$5.00** - Regular usage (500-1000 GPT-3.5 requests)
- **$10.00** - Heavy usage (1000-2000 GPT-3.5 requests)

### Markup Structure
- **15% markup** on all provider costs
- Covers: Infrastructure, Solana fees, development
- Transparent pricing displayed in `/v1/models`

### Example Costs
```
GPT-4 (1K input, 1K output):
  Provider: $0.03 + $0.06 = $0.09
  User pays: $0.09 × 1.15 = $0.1035

GPT-3.5 (1K input, 1K output):
  Provider: $0.0005 + $0.0015 = $0.002
  User pays: $0.002 × 1.15 = $0.0023

Claude 3.5 Sonnet (1K input, 1K output):
  Provider: $0.003 + $0.015 = $0.018
  User pays: $0.018 × 1.15 = $0.0207
```

---

## Development Roadmap

### Phase 1: MVP (2-3 weeks)
- [x] Planning & architecture
- [ ] PostgreSQL + Drizzle schema setup
- [ ] Hono server with basic routes
- [ ] Wallet authentication middleware
- [ ] Balance management (get/check)
- [ ] OpenAI proxy (non-streaming)
- [ ] x402 top-up flow
- [ ] Cost calculation & deduction
- [ ] Basic error handling

### Phase 2: Production Ready (1-2 weeks)
- [ ] Anthropic proxy
- [ ] Streaming support (both providers)
- [ ] Rate limiting
- [ ] Comprehensive error handling
- [ ] Transaction history endpoint
- [ ] Admin dashboard (basic)
- [ ] Monitoring & logging
- [ ] Deployment (Solana mainnet)

### Phase 3: Enhancements (Ongoing)
- [ ] More model support (Mistral, Llama via Replicate)
- [ ] Usage analytics dashboard
- [ ] Webhook notifications (low balance)
- [ ] Bulk top-up discounts
- [ ] Referral system
- [ ] API documentation site
- [ ] Client SDKs (TypeScript, Python)

---

## Testing Strategy

### Unit Tests
```typescript
// Cost calculation
test('calculateCost - GPT-4', () => {
  const cost = calculateCost('gpt-4', {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500
  });
  expect(cost).toBe(0.06075); // (0.03 + 0.03) * 1.15
});

// Balance deduction
test('deductCost - atomic transaction', async () => {
  const result = await deductCost('wallet123', 'openai', 'gpt-4', {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150
  });
  expect(result.cost).toBeGreaterThan(0);
  expect(result.newBalance).toBeLessThan(initialBalance);
});
```

### Integration Tests
```typescript
// End-to-end chat completion
test('POST /v1/chat/completions - with balance', async () => {
  const response = await app.request('/v1/chat/completions', {
    method: 'POST',
    headers: {
      'x-wallet-address': testWallet,
      'x-wallet-signature': validSignature,
      'x-wallet-nonce': Date.now().toString()
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }]
    })
  });
  
  expect(response.status).toBe(200);
  expect(response.headers.get('x-balance-remaining')).toBeDefined();
});

// Low balance triggers 402
test('POST /v1/chat/completions - low balance', async () => {
  // Set balance to $0.10
  await setBalance(testWallet, 0.10);
  
  const response = await app.request('/v1/chat/completions', {
    method: 'POST',
    headers: { /* auth headers */ },
    body: JSON.stringify({ /* request */ })
  });
  
  expect(response.status).toBe(402);
  expect(response.headers.get('x-payment-destination')).toBe(COMPANY_WALLET);
});
```

---

## Deployment

### Infrastructure
- **Hosting:** Vercel, Railway, or Fly.io
- **Database:** Neon, Supabase, or Railway PostgreSQL
- **Domain:** ai.solforge.sh
- **SSL:** Automatic via platform

### Environment Setup
```bash
# Production
bun install
bun run db:migrate
bun run build
bun start

# Development
bun run dev
```

### Database Migrations
```bash
# Generate migration
bun drizzle-kit generate:pg

# Apply migration
bun drizzle-kit push:pg

# Studio (GUI)
bun drizzle-kit studio
```

---

## Open Questions & Decisions

### 1. Top-up Amounts
**Options:**
- Fixed: $1, $5, $10
- Dynamic: User chooses any amount
- Auto-recharge: Trigger $5 top-up automatically when < $0.50

**Decision:** Start with fixed tiers, add dynamic later

### 2. Refund Policy
**Question:** Should users be able to withdraw unused balance?

**Options:**
- A) No refunds (simpler)
- B) Refunds minus 5% fee
- C) Full refunds via Solana transaction

**Decision:** TBD - probably start with no refunds

### 3. Rate Limiting
**Per wallet:** 100 req/min or 1000 req/hour?
**Per model:** Different limits for GPT-4 vs GPT-3.5?

**Decision:** Start with 100/min per wallet, adjust based on usage

### 4. Streaming Cost Calculation
**Challenge:** Can't know final token count until stream completes

**Options:**
- A) Estimate upfront, adjust after (may cause negative balance)
- B) Reserve max tokens, refund difference
- C) Charge after stream completes (delay)

**Decision:** Option C - charge after completion for accuracy

### 5. Solana Network
**Development:** Start on Solana Devnet
**Production:** Migrate to Mainnet-beta

Test with devnet USDC before real money.

---

## Success Metrics

### Launch Goals (Month 1)
- 100+ unique wallets
- $500+ in top-ups
- 10,000+ API requests
- < 1% error rate
- < 200ms median latency

### Growth Goals (Month 3)
- 1,000+ unique wallets
- $5,000+ in top-ups
- 100,000+ API requests
- AI SDK provider package published

---

## Resources & References

### Documentation
- [x402 Protocol Docs](https://docs.payai.network)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Drizzle ORM](https://orm.drizzle.team)
- [Hono Framework](https://hono.dev)

### Example Implementations
- [x402 Hono Example](https://github.com/PayAINetwork/x402-hono)
- [Mistral Provider](https://github.com/vercel/ai/tree/main/packages/mistral)
- [OpenRouter Docs](https://openrouter.ai/docs)

---

## Next Steps

1. ✅ **Planning complete** (this document)
2. **Create project structure** - `apps/ai-proxy` directory
3. **Set up PostgreSQL** - Drizzle schema & migrations
4. **Implement auth middleware** - Wallet signature verification
5. **Build balance system** - Get/check/topup/deduct
6. **Proxy OpenAI** - Non-streaming MVP
7. **Test end-to-end** - Local development
8. **Deploy to devnet** - Solana testnet
9. **Add streaming** - Full production features
10. **Launch on mainnet** - ai.solforge.sh live

---

**Ready to build?** Let's start with Phase 1: MVP implementation.
