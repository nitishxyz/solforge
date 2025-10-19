---
title: solforge program
description: Program management commands
---

# solforge program

Manage Solana programs on your localnet.

## Commands

### `solforge program clone <program-id>`

Clone a program from mainnet/devnet.

```bash
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

**What it does:**
1. Fetches program account data from endpoint
2. Loads program code into localnet
3. Optionally clones program-owned accounts
4. Adds to config for auto-cloning on restart

**Options:**
- `--endpoint <url>`: RPC endpoint
- `--with-accounts`: Also clone program-owned accounts
- `--accounts-limit <number>`: Max accounts to clone

### `solforge program load`

Load a compiled program (.so file).

```bash
solforge program load --file ./target/deploy/my_program.so
```

**Options:**
- `--file <path>`: Path to .so file
- `--program-id <pubkey>`: Optional program ID

### `solforge program accounts clone <program-id>`

Clone only accounts owned by a program.

```bash
solforge program accounts clone <PROGRAM_ID> --limit 100
```

**Options:**
- `--limit <number>`: Max accounts
- `--filters <json>`: getProgramAccounts filters

## Examples

See [Program Deployment](/core/program-deployment) for detailed workflows.
