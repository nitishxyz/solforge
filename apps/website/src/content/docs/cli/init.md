---
title: solforge init
description: Initialize a new SolForge project configuration
---

# solforge init

Create a new `sf.config.json` configuration file with default settings.

## Usage

```bash
solforge init
```

## What It Does

Creates `sf.config.json` in the current directory with default configuration:

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": { "mode": "ephemeral", "path": ".solforge/db.db" }
  },
  "svm": {
    "initialLamports": "1000000000000000",
    "faucetSOL": 1000
  },
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com",
    "programs": [],
    "tokens": [],
    "programAccounts": []
  },
  "gui": { "enabled": true, "port": 42069 },
  "agi": {
    "enabled": true,
    "port": 3456,
    "host": "127.0.0.1",
    "agent": "general"
  },
  "bootstrap": { "airdrops": [] }
}
```

## Examples

```bash
# Initialize config
solforge init

# Then start SolForge
solforge start
```

## Next Steps

- [Configuration Reference](/config/reference) - Customize your config
- solforge - Start the development environment
