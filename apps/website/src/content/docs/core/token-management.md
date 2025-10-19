---
title: Token Management
description: Clone and manage SPL tokens
---

# Token Management

SolForge makes SPL token operations easy with CLI tools and Web GUI.

## Clone Tokens from Mainnet

```bash
# Clone USDC
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Clone USDT
solforge token clone Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

This mirrors the on-chain mint to your localnet.

## Create New Tokens

```bash
solforge token create --decimals 9 --owner <YOUR_PUBKEY>
```

Creates a new SPL token mint locally.

## Mint Tokens

```bash
# Interactive
solforge mint

# With flags
solforge mint --mint <MINT> --to <RECIPIENT> --ui-amount 1000
```

## Auto-Clone on Startup

Add to `sf.config.json`:

```json
{
  "clone": {
    "tokens": [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    ]
  }
}
```

Now `solforge` automatically clones these tokens.

## Programmatic Usage

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const connection = new Connection("http://127.0.0.1:8899");

// Get token account
const ata = await getAssociatedTokenAddress(
  new PublicKey("MINT_ADDRESS"),
  new PublicKey("OWNER_ADDRESS")
);

const account = await getAccount(connection, ata);
console.log("Balance:", account.amount);
```

See [CLI Commands](/cli/token) for complete reference.
