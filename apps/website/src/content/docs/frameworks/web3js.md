---
title: web3.js Integration
description: Using SolForge with @solana/web3.js
---

# web3.js Integration

SolForge works seamlessly with `@solana/web3.js`.

## Basic Usage

```typescript
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// Connect to SolForge
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// Request airdrop
const keypair = Keypair.generate();
const signature = await connection.requestAirdrop(
  keypair.publicKey,
  LAMPORTS_PER_SOL
);
await connection.confirmTransaction(signature);

// Send transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: Keypair.generate().publicKey,
    lamports: LAMPORTS_PER_SOL / 2,
  })
);

const txSig = await sendAndConfirmTransaction(connection, transaction, [keypair]);
console.log("Transaction:", txSig);
```

## Full Compatibility

All web3.js methods work with SolForge:
- Account operations
- Transaction sending
- Program interactions
- Token operations
- Subscription (via WebSocket)

See [First Project](/getting-started/first-project#building-with-web3js-no-anchor) for complete example.
