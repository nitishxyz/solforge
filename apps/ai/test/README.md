# AI Proxy Test Client

## Setup

1. **Generate test wallet** (already done):
   ```bash
   bun run test/generate-wallet.ts
   ```

2. **Update test client with private key**:
   - Edit `test/test-client.ts`
   - Replace `YOUR_PRIVATE_KEY_HERE_WILL_GENERATE_BELOW` with the private key from step 1

3. **Fund the wallet on Solana Devnet**:
   - Get devnet SOL from https://faucet.solana.com
   - Or use `solana airdrop 2 <PUBKEY> --url devnet`

4. **Start the server**:
   ```bash
   sst shell -- bun run src/index.ts
   ```

5. **Run tests**:
   ```bash
   sst shell -- bun run test/test-client.ts
   ```

## Manual Testing

### 1. Check Balance
```bash
curl http://localhost:4000/v1/balance \
  -H "x-wallet-address: YOUR_PUBKEY" \
  -H "x-wallet-signature: SIGNATURE" \
  -H "x-wallet-nonce: TIMESTAMP"
```

### 2. Top-up Balance
```bash
curl -X POST http://localhost:4000/v1/topup \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: YOUR_PUBKEY" \
  -H "x-wallet-signature: SIGNATURE" \
  -H "x-wallet-nonce: TIMESTAMP" \
  -d '{"txSignature": "MOCK_TX_123", "amountUsd": "10.00"}'
```

### 3. Chat Completion
```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: YOUR_PUBKEY" \
  -H "x-wallet-signature: SIGNATURE" \
  -H "x-wallet-nonce: TIMESTAMP" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### 4. Streaming Chat
```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: YOUR_PUBKEY" \
  -H "x-wallet-signature: SIGNATURE" \
  -H "x-wallet-nonce: TIMESTAMP" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Count to 10"}],
    "stream": true
  }'
```

## API Endpoints

- `GET /v1/balance` - Check wallet balance
- `GET /v1/models` - List available models
- `GET /v1/transactions` - Transaction history
- `POST /v1/chat/completions` - Chat completions (streaming & non-streaming)
- `POST /v1/topup` - Add funds to balance

## Notes

- Currently using **mock transactions** for testing (no real Solana tx verification)
- Network set to `solana-devnet`
- Signature verification is active (60s nonce window)
- Min balance: $0.50
- Markup: 15%
