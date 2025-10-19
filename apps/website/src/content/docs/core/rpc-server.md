---
title: RPC Server
description: Lightning-fast LiteSVM-based RPC server
---

# RPC Server

SolForge's RPC server is built on LiteSVM, providing a lightning-fast, fully compatible Solana JSON-RPC API.

## Features

- **90+ RPC methods** - Full Solana compatibility
- **Sub-second startup** - < 1s vs 10-30s for solana-test-validator
- **~50MB memory** - 10x less than solana-test-validator
- **WebSocket subscriptions** - Real-time updates
- **Database modes** - Ephemeral (fast) or persistent

## Configuration

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": {
      "mode": "ephemeral",  // or "persistent"
      "path": ".solforge/db.db"
    }
  }
}
```

## Supported RPC Methods

### Account Operations
- `getAccountInfo`
- `getMultipleAccounts`
- `getProgramAccounts`
- `getBalance`

### Transaction Processing
- `sendTransaction`
- `simulateTransaction`
- `getTransaction`
- `getSignatureStatuses`

### Block & Slot Queries
- `getBlock`
- `getSlot`
- `getBlockHeight`
- `getEpochInfo`

### Token Operations
- `getTokenAccountsByOwner`
- `getTokenSupply`
- `getTokenAccountBalance`

### And 80+ more...

See full list in [API Coverage](#).

## Performance Characteristics

| Metric | SolForge | solana-test-validator |
|--------|----------|----------------------|
| Startup Time | < 1s | 10-30s |
| Memory Usage | ~50MB | 500-800MB |
| CPU Idle | < 1% | 5-10% |
| Transaction Speed | ~instant | ~400ms |

## WebSocket Subscriptions

```typescript
const ws = new WebSocket("ws://127.0.0.1:8900");

// Subscribe to account changes
ws.send(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "accountSubscribe",
  params: [accountAddress]
}));
```

Supported subscriptions:
- `accountSubscribe`
- `signatureSubscribe`
- `programSubscribe`
- `slotSubscribe`

## Health Endpoint

```bash
curl http://127.0.0.1:8899/health
```

Returns server status and uptime.
