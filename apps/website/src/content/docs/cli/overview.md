---
title: CLI Commands Overview
description: Complete reference for all SolForge CLI commands
---

# CLI Commands Overview

Complete reference for all available SolForge CLI commands.

## Quick Reference

```bash
solforge                    # Run interactive setup and start all servers
solforge stop               # Stop all running services
solforge mint               # Interactive token minting
solforge token clone <mint> # Clone SPL token from mainnet
solforge program clone <id> # Clone program from mainnet
solforge airdrop            # Request SOL airdrop
solforge --help             # Show help
solforge --version          # Show version
```

## Global Options

### `--help, -h`

Show help information for any command.

```bash
solforge --help
solforge token --help
solforge program clone --help
```

### `--version, -v`

Show the current SolForge version.

```bash
solforge --version
# Output: 0.2.18
```

## Core Commands

### `solforge`

Run interactive setup (if needed) and start all SolForge services.

```bash
solforge
```

This will:
1. Check for existing `sf.config.json`
2. Run interactive setup wizard if not found
3. Start RPC server on port 8899
4. Start WebSocket server on port 8900
5. Start Web GUI on port 42069 (if enabled)
6. Start AGI server on port 3456 (if enabled)
7. Run bootstrap tasks (airdrops, cloning)

**Options:**
- `--network`: Bind to 0.0.0.0 for LAN access
- `--ci, -y`: Non-interactive mode (skip setup wizard)
- `--debug`: Enable debug logging

```bash
# LAN access
solforge --network

# CI mode
solforge --ci
```

This automatically handles everything - no need for separate `init` and `start` commands!

### `solforge stop`

Stop all running SolForge services.

```bash
solforge stop
```

Gracefully shuts down:
- RPC server
- WebSocket server
- Web GUI
- AGI server

### `solforge status`

Check the status of SolForge services.

```bash
solforge status
```

Shows:
- Running services and their PIDs
- Port allocations
- Configuration file location
- Version information

## Token Management

### `solforge mint`

Interactive token minting wizard.

```bash
solforge mint
```

Prompts for:
- Mint address
- Recipient address
- Amount to mint

**Non-interactive usage:**

```bash
solforge mint --mint <MINT> --to <RECIPIENT> --ui-amount <AMOUNT>
```

**Example:**

```bash
solforge mint --mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --to 9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g --ui-amount 1000
```

See [solforge mint](/docs/cli/mint) for details.

### `solforge token`

Token management commands.

```bash
solforge token create             # Create new SPL token
solforge token clone <mint>       # Clone token from mainnet
solforge token info <mint>        # Show token information
```

**Examples:**

```bash
# Clone USDC
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Create new token
solforge token create --decimals 9 --owner <YOUR_PUBKEY>

# Get token info
solforge token info EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

See [solforge token](/docs/cli/token) for details.

## Program Management

### `solforge program`

Program management commands.

```bash
solforge program clone <program-id>     # Clone program from mainnet
solforge program load <file>            # Load program from file
solforge program info <program-id>      # Show program information
```

**Options for `clone`:**
- `--with-accounts`: Clone program accounts too
- `--accounts-limit <n>`: Limit number of accounts to clone

**Examples:**

```bash
# Clone Token Program
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

# Clone with accounts (limited)
solforge program clone <PROGRAM_ID> --with-accounts --accounts-limit 100

# Load local program
solforge program load --file ./target/deploy/my_program.so
```

See [solforge program](/docs/cli/program) for details.

## Airdrop

### `solforge airdrop`

Request SOL airdrop to your wallet.

```bash
solforge airdrop
```

Interactive prompts for:
- Recipient address
- Amount in SOL

**Non-interactive:**

```bash
solforge airdrop --to <ADDRESS> --amount <SOL>
```

**Example:**

```bash
solforge airdrop --to 9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g --amount 100
```

## Configuration

### `solforge config`

Manage configuration.

```bash
solforge config show              # Show current config
solforge config reset             # Reset to defaults
solforge config set <key> <value> # Set config value
```

**Examples:**

```bash
# Show config
solforge config show

# Change RPC port
solforge config set server.rpcPort 9999

# Enable AGI
solforge config set agi.enabled true
```

## Common Workflows

### First Time Setup

```bash
# Just run solforge - it handles everything!
solforge
```

### Daily Development

```bash
# Terminal 1: Keep SolForge running
solforge

# Terminal 2: Run tests
anchor build && anchor deploy
anchor test --skip-local-validator
# or
bun test
```

### Typical Workflow

```bash
solforge
anchor build && anchor deploy
anchor test --skip-local-validator
```

### Clone Mainnet Resources

```bash
# Start SolForge
solforge &

# Clone USDC
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Clone Token Program
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

### Environment Variables

```bash
DEBUG_RPC_LOG=1 solforge
SOLFORGE_GUI_PORT=3000 solforge
```

## Command Flags

### Global Flags

Available on all commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show command help |
| `--version` | `-v` | Show version |
| `--debug` | | Enable debug logging |

### Server Flags

Available on `solforge` command:

| Flag | Short | Description |
|------|-------|-------------|
| `--network` | | Bind to 0.0.0.0 (LAN access) |
| `--ci` | `-y` | Non-interactive mode |
| `--debug` | | Enable debug logs |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Port already in use |
| 4 | File not found |

## See Also

- [Configuration Reference](/docs/config/reference) - All config options
- [First Project](/docs/getting-started/first-project) - Complete tutorial
- [Quick Start](/docs/getting-started/quickstart) - Get started fast
