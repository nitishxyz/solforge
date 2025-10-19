---
title: Program Deployment
description: Deploy and clone Solana programs
---

# Program Deployment

SolForge supports deploying your own programs and cloning existing ones.

## Deploy Your Programs

### With Anchor

```bash
# Build
anchor build

# Deploy to SolForge
anchor deploy
```

### With Solana CLI

```bash
solana program deploy ./target/deploy/my_program.so
```

### With SolForge CLI

```bash
solforge program load --file ./target/deploy/my_program.so
```

## Clone Programs from Mainnet

```bash
# Clone Token Program
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

# Clone with accounts
solforge program clone <PROGRAM_ID> --with-accounts --accounts-limit 100
```

## Auto-Clone on Startup

```json
{
  "clone": {
    "programs": [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    ]
  }
}
```

## Common Programs to Clone

- **Token Program**: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- **Token-2022**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- **Metaplex**: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- **Associated Token**: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

See [CLI Commands](/cli/program) for complete reference.
