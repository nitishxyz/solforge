---
title: Configuration Reference
description: Complete sf.config.json configuration reference for SolForge
---

solforge
This runs interactive setup and creates the config file. You can also manually create it in your project root.
# Configuration Reference

Complete reference for `sf.config.json` configuration file.

## File Location

The configuration file is named `sf.config.json` and should be placed in your project root directory.

```bash
# Create default config
solforge
```

## Default Configuration

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": {
      "mode": "ephemeral",
      "path": ".solforge/db.db"
    }
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
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "agi": {
    "enabled": true,
    "port": 3456,
    "host": "127.0.0.1",
    "agent": "general"
  },
  "bootstrap": {
    "airdrops": []
  }
}
```

## Configuration Sections

### `server`

RPC and WebSocket server configuration.

#### `server.rpcPort`

- **Type**: `number`
- **Default**: `8899`
- **Description**: Port for the JSON-RPC HTTP server

```json
{
  "server": {
    "rpcPort": 8899
  }
}
```

#### `server.wsPort`

- **Type**: `number`
- **Default**: `8900`
- **Description**: Port for the WebSocket subscription server

```json
{
  "server": {
    "wsPort": 8900
  }
}
```

#### `server.db`

Database configuration for account/transaction storage.

##### `server.db.mode`

- **Type**: `"ephemeral" | "persistent"`
- **Default**: `"ephemeral"`
- **Description**: 
  - `ephemeral`: In-memory database, data lost on restart (fast)
  - `persistent`: SQLite database, data persists across restarts

```json
{
  "server": {
    "db": {
      "mode": "ephemeral"
    }
  }
}
```

##### `server.db.path`

- **Type**: `string`
- **Default**: `".solforge/db.db"`
- **Description**: Path to SQLite database file (only used when mode is `persistent`)

```json
{
  "server": {
    "db": {
      "mode": "persistent",
      "path": ".solforge/db.db"
    }
  }
}
```

### `svm`

Solana Virtual Machine configuration.

#### `svm.initialLamports`

- **Type**: `string`
- **Default**: `"1000000000000000"` (1 million SOL)
- **Description**: Initial lamports for the faucet account (as string to handle large numbers)

```json
{
  "svm": {
    "initialLamports": "1000000000000000"
  }
}
```

#### `svm.faucetSOL`

- **Type**: `number`
- **Default**: `1000`
- **Description**: Default SOL amount for each airdrop request

```json
{
  "svm": {
    "faucetSOL": 1000
  }
}
```

### `clone`

Configuration for cloning programs and tokens from mainnet/devnet.

#### `clone.endpoint`

- **Type**: `string`
- **Default**: `"https://api.mainnet-beta.solana.com"`
- **Description**: RPC endpoint to fetch programs and tokens from

Other options:
- `"https://api.devnet.solana.com"`
- `"https://api.testnet.solana.com"`
- Custom RPC endpoints (Helius, QuickNode, etc.)

```json
{
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com"
  }
}
```

#### `clone.programs`

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: List of program IDs to clone on startup

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

#### `clone.tokens`

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: List of token mint addresses to clone on startup

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

#### `clone.programAccounts`

- **Type**: `Array<{ programId: string, limit?: number, filters?: unknown[] }>`
- **Default**: `[]`
- **Description**: Clone accounts owned by specific programs with optional filters

```json
{
  "clone": {
    "programAccounts": [
      {
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "limit": 100
      },
      {
        "programId": "YourProgramID",
        "limit": 50,
        "filters": [
          {
            "memcmp": {
              "offset": 0,
              "bytes": "..."
            }
          }
        ]
      }
    ]
  }
}
```

### `gui`

Web dashboard configuration.

#### `gui.enabled`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable the web dashboard

```json
{
  "gui": {
    "enabled": true
  }
}
```

#### `gui.port`

- **Type**: `number`
- **Default**: `42069`
- **Description**: Port for the web dashboard server

```json
{
  "gui": {
    "port": 42069
  }
}
```

### `agi`

AI assistant configuration.

#### `agi.enabled`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable the AI assistant

```json
{
  "agi": {
    "enabled": true
  }
}
```

#### `agi.port`

- **Type**: `number`
- **Default**: `3456`
- **Description**: Port for the AGI server

```json
{
  "agi": {
    "port": 3456
  }
}
```

#### `agi.host`

- **Type**: `string`
- **Default**: `"127.0.0.1"`
- **Description**: Host to bind AGI server to

```json
{
  "agi": {
    "host": "127.0.0.1"
  }
}
```

#### `agi.provider`

- **Type**: `"openrouter" | "anthropic" | "openai"`
- **Default**: `undefined`
- **Description**: AI provider to use

```json
{
  "agi": {
    "provider": "openrouter"
  }
}
```

#### `agi.model`

- **Type**: `string`
- **Default**: `undefined`
- **Description**: Specific model to use

Examples:
- OpenRouter: `"anthropic/claude-3.5-sonnet"`, `"openai/gpt-4-turbo"`
- Anthropic: `"claude-sonnet-4.5-20250514"`
- OpenAI: `"gpt-4-turbo"`, `"gpt-4o"`

```json
{
  "agi": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  }
}
```

#### `agi.apiKey`

- **Type**: `string`
- **Default**: `undefined`
- **Description**: API key for the provider (can also use environment variables)

```json
{
  "agi": {
    "apiKey": "sk-or-v1-..."
  }
}
```

Alternatively, use environment variables:
- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

#### `agi.agent`

- **Type**: `"general" | "build"`
- **Default**: `"general"`
- **Description**: Agent type for specialized behavior
  - `general`: General Solana development & debugging
  - `build`: Build processes & deployment tasks

```json
{
  "agi": {
    "agent": "general"
  }
}
```

### `bootstrap`

Automatic setup configuration that runs on `solforge`.

#### `bootstrap.airdrops`

- **Type**: `Array<{ address: string, amountSol: number }>`
- **Default**: `[]`
- **Description**: List of addresses to automatically airdrop SOL to on startup

```json
{
  "bootstrap": {
    "airdrops": [
      {
        "address": "YourWalletAddress...",
        "amountSol": 100
      },
      {
        "address": "AnotherWallet...",
        "amountSol": 50
      }
    ]
  }
}
```

## Managing Configuration

### Reading Config Values

```bash
solforge config get server.rpcPort
# Output: 8899

solforge config get agi.enabled
# Output: true
```

### Setting Config Values

```bash
solforge config set server.rpcPort 9999
solforge config set agi.enabled false
solforge config set clone.endpoint "https://api.devnet.solana.com"
```

### Programmatic Access

```typescript
import { readConfig, writeConfig } from "@solforge/cli/config";

// Read config
const config = await readConfig("sf.config.json");
console.log(config.server.rpcPort);

// Modify config
config.server.rpcPort = 9999;
await writeConfig(config, "sf.config.json");
```

## Example Configurations

### Minimal Configuration

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900
  }
}
```

### Development with AI

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900
  },
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "agi": {
    "enabled": true,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "bootstrap": {
    "airdrops": [
      {
        "address": "YourWallet...",
        "amountSol": 100
      }
    ]
  }
}
```

### Production Testing Setup

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": {
      "mode": "persistent",
      "path": ".solforge/db.db"
    }
  },
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com",
    "programs": [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ],
    "tokens": [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ]
  },
  "gui": {
    "enabled": false
  },
  "agi": {
    "enabled": false
  }
}
```

### Team Development

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900
  },
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "clone": {
    "programs": [
      "YourMainProgram...",
      "YourHelperProgram..."
    ],
    "tokens": [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ]
  },
  "bootstrap": {
    "airdrops": [
      {
        "address": "TeamWallet1...",
        "amountSol": 100
      },
      {
        "address": "TeamWallet2...",
        "amountSol": 100
      }
    ]
  }
}
```

## Environment Variables

Some configuration can be overridden with environment variables:

- `RPC_HOST`: Override server host (default: `127.0.0.1`)
- `OPENROUTER_API_KEY`: OpenRouter API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `OPENAI_API_KEY`: OpenAI API key
- `DEBUG_RPC_LOG`: Enable RPC debug logging (set to `1`)
- `SOLFORGE_GUI_PORT`: Override GUI port
- `SOLFORGE_AGI_PORT`: Override AGI port

## Command-Line Overrides

```bash
# Use network mode (bind to 0.0.0.0 for LAN access)
solforge --network

# Non-interactive mode (use existing config)
solforge --ci
solforge -y

# Debug mode
solforge --debug
```

## Best Practices

### 1. Version Control

Add to `.gitignore`:
```
sf.config.json
.solforge/
```

Share a template instead:
```bash
cp sf.config.json sf.config.example.json
```

### 2. Separate Configs for Environments

```bash
# Development
cp sf.config.dev.json sf.config.json

# Testing
cp sf.config.test.json sf.config.json

# CI/CD
cp sf.config.ci.json sf.config.json
```

### 3. Sensitive Data

Never commit API keys to git. Use environment variables:

```json
{
  "agi": {
    "enabled": true,
    "provider": "openrouter"
  }
}
```

Then:
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
solforge
```

### 4. Port Management

Use different ports for different projects to run multiple instances:

```json
{
  "server": {
    "rpcPort": 9999,
    "wsPort": 10000
  },
  "gui": {
    "port": 9069
  }
}
```

## Troubleshooting

### Configuration Not Loading

1. Verify file exists: `ls -la sf.config.json`
2. Check JSON syntax: `bun run -c 'JSON.parse(await Bun.file("sf.config.json").text())'`
3. Use default config: `solforge` to regenerate config

### Port Already in Use

Change ports in config or use environment variables:

```bash
SOLFORGE_GUI_PORT=3000 solforge
```

### AI Not Starting

1. Check API key is set (config or environment)
2. Verify provider/model are correct
3. Check AGI logs for errors

## Related Documentation

- [CLI Commands](/cli/overview) - Command-line interface reference
- [AI Configuration](/ai/providers) - Detailed AI provider setup
- [First Project](/getting-started/first-project) - Getting started guide
