# SolForge API Documentation

SolForge includes a REST API server that runs alongside your local validator, providing programmatic access to validator operations and token management.

## Getting Started

The API server starts automatically when you run `solforge start` and is available at:

```
http://127.0.0.1:3000/api
```

The API server will:

- Start in the background when you run `solforge start`
- Stop automatically when you run `solforge stop`
- Use port 3000 by default (configurable)

## Base URL

All API endpoints are prefixed with `/api`:

```
Base URL: http://127.0.0.1:3000/api
```

## Authentication

Currently, no authentication is required. The API server is intended for local development use only.

## Endpoints

### Health Check

Check if the API server is running.

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Validator Information

Get information about the running validator.

```http
GET /api/validator/info
```

**Response:**

```json
{
  "version": {
    "solana-core": "1.17.0"
  },
  "blockHeight": 12345,
  "slotLeader": "11111111111111111111111111111111",
  "rpcUrl": "http://127.0.0.1:8899",
  "faucetUrl": "http://127.0.0.1:9900"
}
```

### List Tokens

Get all cloned tokens available on the validator.

```http
GET /api/tokens
```

**Response:**

```json
{
  "tokens": [
    {
      "symbol": "USDC",
      "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintAuthority": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
      "recipients": [
        {
          "wallet": "YourWalletPublicKeyHere",
          "amount": 1000000000
        }
      ],
      "cloneMetadata": true
    }
  ],
  "count": 1
}
```

### List Programs

Get all cloned programs available on the validator.

```http
GET /api/programs
```

**Response:**

```json
{
  "programs": [
    {
      "name": "Token Metadata",
      "programId": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
      "filePath": "/path/to/program.so"
    }
  ],
  "count": 1
}
```

### Mint Tokens

Mint tokens to a specific wallet address.

```http
POST /api/tokens/:symbol/mint
```

**Parameters:**

- `symbol` (path parameter) - Token symbol (e.g., "USDC")

**Request Body:**

```json
{
  "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  "amount": 1000
}
```

**Response:**

```json
{
  "success": true,
  "symbol": "USDC",
  "amount": 1000,
  "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  "mintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**Error Response:**

```json
{
  "error": "Token INVALID not found in cloned tokens"
}
```

### Get Wallet Balances

Get SOL and token balances for a specific wallet.

```http
GET /api/wallet/:address/balances
```

**Parameters:**

- `address` (path parameter) - Wallet public key

**Response:**

```json
{
  "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  "solBalance": {
    "lamports": 1000000000,
    "sol": 1.0
  },
  "tokenBalances": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC",
      "balance": "1000000000",
      "decimals": 6,
      "uiAmount": 1000
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Airdrop SOL

Airdrop SOL to a wallet address.

```http
POST /api/airdrop
```

**Request Body:**

```json
{
  "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  "amount": 1
}
```

**Response:**

```json
{
  "success": true,
  "amount": 1,
  "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  "signature": "5j7s8K9mN2pQ3rT4uV5wX6yZ7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3a4B5c6D7e8F"
}
```

### Get Recent Transactions

Get recent transactions from the validator.

```http
GET /api/transactions/recent?limit=10
```

**Query Parameters:**

- `limit` (optional) - Number of transactions to return (max 100, default 10)

**Response:**

```json
{
  "transactions": [
    {
      "signature": "5j7s8K9mN2pQ3rT4uV5wX6yZ7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3a4B5c6D7e8F",
      "slot": 12345,
      "blockTime": 1642234567,
      "confirmationStatus": "finalized"
    }
  ],
  "count": 1
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (endpoint doesn't exist)
- `500` - Internal Server Error

Error responses include details:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Examples

### Using curl

**Mint tokens:**

```bash
curl -X POST http://127.0.0.1:3000/api/tokens/USDC/mint \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
    "amount": 1000
  }'
```

**Get wallet balances:**

```bash
curl http://127.0.0.1:3000/api/wallet/HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ/balances
```

**Airdrop SOL:**

```bash
curl -X POST http://127.0.0.1:3000/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
    "amount": 1
  }'
```

### Using JavaScript/TypeScript

```typescript
const API_BASE = "http://127.0.0.1:3000/api";

// Mint tokens
async function mintTokens(
  symbol: string,
  walletAddress: string,
  amount: number
) {
  const response = await fetch(`${API_BASE}/tokens/${symbol}/mint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      walletAddress,
      amount,
    }),
  });

  return response.json();
}

// Get wallet balances
async function getWalletBalances(address: string) {
  const response = await fetch(`${API_BASE}/wallet/${address}/balances`);
  return response.json();
}

// Usage
const result = await mintTokens(
  "USDC",
  "HpHke1uSs4VzA8m76Uy2aDfnhDg2Dw2vJMQvpBVU5mTJ",
  1000
);
console.log(result);
```

## Configuration

The API server port can be configured by setting the `API_PORT` environment variable or by modifying the start command configuration.

## CORS

CORS is enabled for all origins to facilitate local web development. In production, you should configure appropriate CORS settings.

## Rate Limiting

Currently, no rate limiting is implemented. The API is intended for local development use only.

## WebSocket Support

WebSocket support is not currently implemented but may be added in future versions for real-time updates.
