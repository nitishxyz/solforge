# SolForge API Server

The SolForge API server runs automatically when you start a validator and provides REST endpoints to interact with your local Solana validator.

## Base URL

When you start a validator, the API server will be available at `http://127.0.0.1:<PORT>/api` where `<PORT>` is automatically assigned (starting from 3000).

## Endpoints

### Health Check

**GET** `/api/health`

Returns the health status of the API server.

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Validator Information

**GET** `/api/validator/info`

Get information about the running validator.

```json
{
  "version": { "solana-core": "1.17.0" },
  "blockHeight": 1000,
  "slotLeader": "11111111111111111111111111111111",
  "rpcUrl": "http://127.0.0.1:8899",
  "faucetUrl": "http://127.0.0.1:9900"
}
```

### Cloned Tokens

**GET** `/api/tokens`

List all cloned tokens available on the validator.

```json
{
  "tokens": [
    {
      "symbol": "USDC",
      "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintAmount": 1000000,
      "mintAuthority": "5uaZKvvxNWrHqtHUUZKUVHmLkP7k8mE7XzEtU4i5v2Wk",
      "recipients": [
        {
          "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          "amount": 100000
        }
      ],
      "cloneMetadata": true
    }
  ],
  "count": 1
}
```

### Cloned Programs

**GET** `/api/programs`

List all cloned programs available on the validator.

```json
{
  "programs": [
    {
      "name": "Token Program",
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "filePath": "/path/to/token-program.so"
    }
  ],
  "count": 1
}
```

### Mint Tokens

**POST** `/api/tokens/{symbol}/mint`

Mint tokens to a specific wallet address.

**Request Body:**

```json
{
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 1000
}
```

**Response:**

```json
{
  "success": true,
  "symbol": "USDC",
  "amount": 1000,
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "mintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "signature": "2xQ7..."
}
```

### Wallet Balances

**GET** `/api/wallet/{address}/balances`

Get SOL and token balances for a wallet address.

```json
{
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "solBalance": {
    "lamports": 1000000000,
    "sol": 1.0
  },
  "tokenBalances": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC",
      "balance": "100000",
      "decimals": 6,
      "uiAmount": 100.0
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Airdrop SOL

**POST** `/api/airdrop`

Airdrop SOL to a wallet address.

**Request Body:**

```json
{
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 1
}
```

**Response:**

```json
{
  "success": true,
  "amount": 1,
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "signature": "3xR8..."
}
```

### Recent Transactions

**GET** `/api/transactions/recent?limit=10`

Get recent transactions on the validator.

```json
{
  "transactions": [
    {
      "signature": "2xQ7...",
      "slot": 1000,
      "err": null,
      "memo": null,
      "blockTime": 1640995200
    }
  ],
  "count": 1
}
```

## Error Responses

All endpoints return standard HTTP status codes and error objects:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## CORS

The API server has CORS enabled, so you can make requests from web browsers.

## Examples

### Using curl

```bash
# Get cloned tokens
curl http://127.0.0.1:3000/api/tokens

# Mint tokens
curl -X POST http://127.0.0.1:3000/api/tokens/USDC/mint \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "amount": 1000}'

# Airdrop SOL
curl -X POST http://127.0.0.1:3000/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "amount": 1}'
```

### Using JavaScript fetch

```javascript
// Get cloned tokens
const tokens = await fetch("http://127.0.0.1:3000/api/tokens").then((r) =>
  r.json()
);

// Mint tokens
const mintResult = await fetch("http://127.0.0.1:3000/api/tokens/USDC/mint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    amount: 1000,
  }),
}).then((r) => r.json());
```
