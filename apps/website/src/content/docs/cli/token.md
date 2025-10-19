---
title: solforge token
description: Token management commands
---

# solforge token

Manage SPL tokens on your localnet.

## Commands

### `solforge token clone <mint>`

Clone a token mint from mainnet/devnet.

```bash
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**What it does:**
1. Fetches mint account data from specified endpoint
2. Creates identical mint on localnet
3. Adopts faucet as mint authority (for easy minting)
4. Adds mint to `sf.config.json` for auto-cloning on restart

**Options:**
- `--endpoint <url>`: RPC endpoint (default: from config)

### `solforge token create`

Create a new SPL token locally.

```bash
solforge token create --decimals 9 --owner <PUBKEY>
```

**Options:**
- `--decimals <number>`: Token decimals (0-18)
- `--owner <pubkey>`: Mint authority
- `--mint <pubkey>`: Optional mint address
- `--ui-amount <number>`: Initial balance for owner's ATA

### `solforge token adopt-authority <mint>`

Change mint authority to faucet (local only).

```bash
solforge token adopt-authority <MINT>
```

Useful for cloned tokens where you want to mint freely.

## Examples

See [Token Management](/core/token-management) for detailed examples.
