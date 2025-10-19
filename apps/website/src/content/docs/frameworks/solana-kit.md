---
title: "@solana/kit Integration"
description: Using SolForge with modern Solana kit
---

# @solana/kit Integration

SolForge works with the modern `@solana/kit` (next-gen web3.js).

## Usage

```typescript
import { createSolanaRpc } from "@solana/kit";
import { address, lamports } from "@solana/web3.js";

const rpc = createSolanaRpc("http://127.0.0.1:8899");

// Request airdrop
await rpc
  .requestAirdrop(address("YourWallet..."), lamports(100_000_000_000n))
  .send();

// Get balance
const balance = await rpc.getBalance(address("YourWallet...")).send();
console.log(balance);
```

## Why @solana/kit?

- Modern, type-safe API
- Better tree-shaking
- Improved developer experience
- Future of Solana development

SolForge fully supports it.
