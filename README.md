# SolForge

[![npm version](https://badge.fury.io/js/solforge.svg)](https://badge.fury.io/js/solforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SolForge** is a powerful Solana localnet orchestration tool that simplifies the process of setting up and managing local Solana development environments. It allows you to clone mainnet programs and tokens to your local validator, making it easy to develop and test Solana applications with real-world data.

## ✨ Features

- 🚀 **One-command setup** - Initialize and start a localnet with a single command
- 🔄 **Mainnet cloning** - Clone tokens and programs from Solana mainnet to your localnet
- 🎯 **Multi-validator support** - Run multiple validators simultaneously with different configurations
- 💰 **Token management** - Mint tokens with custom amounts and distribute to specific wallets
- 🔧 **Program deployment** - Deploy and manage Solana programs on your localnet
- 📊 **Process management** - Monitor, start, stop, and manage validator processes
- 🌐 **Port management** - Automatic port allocation and conflict resolution
- 📝 **Configuration-driven** - JSON-based configuration for reproducible environments
- 🎨 **Beautiful CLI** - Colorful, intuitive command-line interface
- 🌐 **REST API** - Background API server for programmatic access to validator operations

## 📦 Installation

### Prerequisites

- [Solana CLI tools](https://docs.solana.com/cli/install-solana-cli-tools) installed and configured
- Node.js 18+ or [Bun](https://bun.sh) runtime

### Install from npm (Recommended)

```bash
# Install globally with npm
npm install -g solforge

# Or with bun
bun install -g solforge

# Or with yarn
yarn global add solforge
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/nitishxyz/solforge.git
cd solforge

# Install dependencies
bun install

# Build and install globally
bun run build:npm
npm install -g .
```

### Verify Installation

```bash
solforge --version
solforge --help
```

## 🚀 Quick Start

### Basic Usage

1. **Initialize a new project**:

   ```bash
   solforge init
   ```

2. **Start your localnet**:

   ```bash
   solforge start
   ```

3. **Check status**:

   ```bash
   solforge status
   solforge list
   ```

4. **Stop when done**:
   ```bash
   solforge stop --all
   ```

### API Server

SolForge automatically starts a REST API server alongside your validator, providing programmatic access to validator operations:

```bash
# API server starts automatically with the validator
solforge start

# API available at http://127.0.0.1:3000/api
curl http://127.0.0.1:3000/api/health

# Mint tokens via API (using mint address)
curl -X POST http://127.0.0.1:3000/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/mint \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YOUR_WALLET_ADDRESS", "amount": 1000}'

# Get wallet balances
curl http://127.0.0.1:3000/api/wallet/YOUR_WALLET_ADDRESS/balances
```

For complete API documentation, see [API Documentation](docs/API.md).

## 📖 Documentation

### 📚 Additional Documentation

- [API Documentation](docs/API.md) - REST API endpoints and usage examples
- [Configuration Guide](docs/CONFIGURATION.md) - Detailed configuration options and examples
- [Troubleshooting Guide](#-troubleshooting) - Common issues and solutions

### Commands

#### `solforge init`

Initialize a new `sf.config.json` configuration file in the current directory.

```bash
solforge init
```

This command will prompt you for:

- Project name
- Description
- RPC port (default: 8899)
- Whether to include USDC token

#### `solforge start [options]`

Start a localnet validator with the current configuration.

```bash
solforge start                # Start with default settings
solforge start --debug        # Start with debug logging
solforge start --network      # Make API server accessible over network
solforge start --debug --network  # Debug mode + network access
```

**Options:**

- `--debug` - Enable debug logging to see detailed command output
- `--network` - Make API server accessible over network (binds to 0.0.0.0 instead of 127.0.0.1)

#### `solforge list`

List all running validators with detailed information.

```bash
solforge list
```

Shows:

- Validator ID and name
- Process ID (PID)
- RPC and Faucet ports
- Uptime
- Status
- Connection URLs

#### `solforge stop [validator-id] [options]`

Stop running validators.

```bash
solforge stop                 # Interactive selection
solforge stop <validator-id>  # Stop specific validator
solforge stop --all           # Stop all validators
solforge stop --kill          # Force kill (SIGKILL)
```

**Options:**

- `--all` - Stop all running validators
- `--kill` - Force kill the validator (SIGKILL instead of SIGTERM)

#### `solforge kill [validator-id] [options]`

Force kill running validators with interactive selection.

```bash
solforge kill                 # Interactive selection with validator list
solforge kill <validator-id>  # Kill specific validator
solforge kill --all           # Kill all validators
```

**Interactive Mode:**
When run without arguments, `solforge kill` will:

- Display a table of all running validators
- Allow you to select which validator to kill using arrow keys
- Provide options to kill individual validators, all validators, or cancel
- No need to copy/paste validator IDs from `solforge list`

#### `solforge status`

Show overall localnet status and configuration summary.

```bash
solforge status
```

#### `solforge add-program [options]`

Add a program to your configuration.

```bash
solforge add-program                                    # Interactive mode
solforge add-program --program-id <address>             # Non-interactive
solforge add-program --program-id <address> --name <name>
```

**Options:**

- `--program-id <address>` - Mainnet program ID to clone and deploy
- `--name <name>` - Friendly name for the program
- `--no-interactive` - Run in non-interactive mode

#### `solforge mint [options]`

Interactively mint tokens to any wallet address.

```bash
solforge mint                                        # Interactive mode
solforge mint --symbol USDC --wallet <address> --amount 1000  # CLI mode
solforge mint --rpc-url http://localhost:8899       # Custom RPC
```

**Options:**

- `--rpc-url <url>` - RPC URL to use (default: "http://127.0.0.1:8899")
- `--symbol <symbol>` - Token symbol to mint
- `--wallet <address>` - Wallet address to mint to
- `--amount <amount>` - Amount to mint

**Interactive Mode:**
When run without arguments, `solforge mint` will:

- Display available cloned tokens
- Allow you to select which token to mint
- Prompt for recipient wallet address
- Prompt for amount to mint
- Handle SPL token account creation automatically

#### `solforge api-server [options]`

Start the API server as a standalone service (without validator).

```bash
solforge api-server                                    # Start on default port 3000
solforge api-server --port 8080                       # Custom port
solforge api-server --host 0.0.0.0                    # Network accessible
solforge api-server --rpc-url http://localhost:8899   # Custom RPC
```

**Options:**

- `-p, --port <port>` - Port for API server (default: 3000)
- `--host <host>` - Host to bind to (default: 127.0.0.1, use 0.0.0.0 for network access)
- `--rpc-url <url>` - Validator RPC URL (default: http://127.0.0.1:8899)
- `--faucet-url <url>` - Validator faucet URL (default: http://127.0.0.1:9900)
- `--work-dir <dir>` - Work directory (default: ./.solforge)

#### `solforge reset`

Reset localnet ledger (coming soon).

```bash
solforge reset
```

### Configuration File (`sf.config.json`)

The configuration file defines your localnet setup. For detailed configuration options, see the [Configuration Guide](docs/CONFIGURATION.md).

Here's the complete schema:

```json
{
  "name": "my-localnet",
  "description": "Local Solana development environment",
  "tokens": [
    {
      "symbol": "USDC",
      "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintAuthority": "./keypairs/mint-authority.json",
      "mintAmount": 1000000,
      "cloneMetadata": true,
      "recipients": [
        {
          "wallet": "YourWalletPublicKeyHere",
          "amount": 1000000000
        }
      ]
    }
  ],
  "programs": [
    {
      "name": "Token Metadata",
      "mainnetProgramId": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
      "cluster": "mainnet-beta",
      "upgradeable": false,
      "dependencies": []
    }
  ],
  "localnet": {
    "airdropAmount": 100,
    "faucetAccounts": ["YourWalletPublicKeyHere"],
    "port": 8899,
    "faucetPort": 9900,
    "reset": true,
    "logLevel": "info",
    "bindAddress": "127.0.0.1",
    "limitLedgerSize": 100000,
    "rpc": "https://api.mainnet-beta.solana.com"
  }
}
```

#### Configuration Schema

For detailed configuration options and examples, see the [Configuration Guide](docs/CONFIGURATION.md).

**Quick Reference:**

- `name` - Project name
- `description` - Project description
- `tokens[]` - Tokens to clone from mainnet
- `programs[]` - Programs to clone from mainnet
- `localnet` - Validator settings (ports, logging, etc.)

## 🎯 Use Cases

### DeFi Development

Clone popular DeFi tokens and programs to test your application:

```json
{
  "name": "defi-testing",
  "tokens": [
    {
      "symbol": "USDC",
      "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintAmount": 10000000
    },
    {
      "symbol": "USDT",
      "mainnetMint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "mintAmount": 10000000
    }
  ],
  "programs": [
    {
      "name": "Jupiter",
      "mainnetProgramId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
    }
  ]
}
```

### NFT Development

Set up an environment for NFT projects:

```json
{
  "name": "nft-development",
  "programs": [
    {
      "name": "Token Metadata",
      "mainnetProgramId": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    },
    {
      "name": "Candy Machine",
      "mainnetProgramId": "cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ"
    }
  ]
}
```

### Multi-Environment Testing

Run multiple validators for different test scenarios:

```bash
# Terminal 1 - DeFi environment
cd defi-project
solforge start

# Terminal 2 - NFT environment
cd nft-project
solforge start

# Check both
solforge list
```

## 🔧 Development

### Project Structure

```
src/
├── commands/          # CLI command implementations
│   ├── init.ts        # Initialize configuration
│   ├── start.ts       # Start validator
│   ├── stop.ts        # Stop validator
│   ├── list.ts        # List validators
│   ├── status.ts      # Show status
│   ├── add-program.ts # Add programs
│   └── transfer.ts    # Transfer tokens
├── config/            # Configuration management
│   └── manager.ts     # Config file operations
├── services/          # Core services
│   ├── validator.ts   # Validator management
│   ├── token-cloner.ts    # Token cloning logic
│   ├── program-cloner.ts  # Program cloning logic
│   ├── port-manager.ts    # Port allocation
│   └── process-registry.ts # Process tracking
├── types/             # TypeScript definitions
│   └── config.ts      # Configuration schemas
├── utils/             # Utility functions
│   └── shell.ts       # Shell command helpers
└── index.ts           # CLI entry point
```

### Build Commands

```bash
# Development
bun run dev            # Watch mode development

# Building
bun run build          # Build for Node.js
bun run build:binary   # Build standalone binary

# Testing & Quality
bun test               # Run tests
bun run lint           # Lint code
bun run format         # Format code

# Installation
bun run install:binary # Install binary to ~/.local/bin
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting: `bun test && bun run lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**Port already in use**

```bash
# Check what's using the port
lsof -i :8899

# Use a different port in sf.config.json
{
  "localnet": {
    "port": 8900,
    "faucetPort": 9901
  }
}
```

**Validator won't start**

```bash
# Check Solana CLI is installed
solana --version

# Check configuration
solforge status

# Start with debug logging
solforge start --debug
```

**Token cloning fails**

- Ensure RPC URL in config is accessible
- Check mainnet mint address is correct
- Verify network connectivity

**Program deployment fails**

- Ensure program ID exists on specified cluster
- Check if program has dependencies that need to be deployed first
- Verify sufficient SOL for deployment

### Debug Mode

Use `--debug` flag to see detailed command output:

```bash
solforge start --debug
```

This shows:

- Exact solana-test-validator commands
- Program deployment steps
- Token cloning operations
- Error details

### Logs and Data

SolForge stores data in:

- `~/.solforge/` - Process registry and metadata
- `.solforge/` - Local working directory for current project

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/nitishxyz/solforge/issues)

## 🙏 Acknowledgments

- [Solana Labs](https://solana.com) for the amazing blockchain platform
- [Bun](https://bun.sh) for the fast JavaScript runtime
- The Solana developer community for inspiration and feedback

---

**Happy building on Solana! 🚀**
