# 🔥 SolForge

> **Lightning-fast Solana localnet for developers** ⚡
> Drop-in replacement for `solana-test-validator` with sub-second startup and minimal memory footprint.

[![Version](https://img.shields.io/badge/version-0.2.5-blue)](https://github.com/nitishxyz/solforge)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Powered by LiteSVM](https://img.shields.io/badge/powered%20by-LiteSVM-purple)](https://github.com/litesvm/litesvm)

## ✨ Features

- **⚡ Blazing Fast**: Sub-second startup, ~50MB memory (vs 500MB+ for test-validator)
- **🔌 Drop-in Compatible**: Works with Solana CLI, Anchor, web3.js, and @solana/kit
- **💰 Unlimited Airdrops**: Built-in faucet with no rate limits
- **🎨 Web GUI**: Interactive dashboard for airdrops, minting, and monitoring
- **📦 Program Cloning**: Import programs and accounts from mainnet
- **🔄 WebSocket Support**: Real-time transaction subscriptions (in the works)
 

## 🚀 Quick Install

### One-Liner Install (Recommended)

```bash
curl -fsSL https://install.solforge.sh | sh
```

### Manual Install

Download the latest binary from [GitHub Releases](https://github.com/nitishxyz/solforge/releases) and add to your PATH.

### NPM/Bun Install

```bash
# Using npm
npm install -g solforge

# Using bun
bun install -g solforge
```

## 🎯 Quick Start

### 1️⃣ Start the Localnet

```bash
solforge
```

This starts:

- 🌐 **RPC Server**: `http://127.0.0.1:8899`
- 📡 **WebSocket**: `ws://127.0.0.1:8900`
- 🎨 **Web GUI**: `http://127.0.0.1:42069`

### 2️⃣ Configure Solana CLI

```bash
solana config set -u http://127.0.0.1:8899
```

### 3️⃣ Get Some SOL

```bash
# Using Solana CLI
solana airdrop 1000

# Using SolForge CLI
solforge airdrop --to <PUBKEY> --sol 100
```

## 📚 Command Reference

### 🔧 Server Commands

#### Start Server

```bash
# Basic start
solforge start

# Custom ports
solforge start --port 8899 --ws-port 8900

# Bind to 0.0.0.0 for LAN access
solforge start --network
```

### 💰 Airdrop Commands

#### Send SOL

```bash
# Airdrop to specific address
solforge airdrop --to <PUBKEY> --sol 100

# Interactive mode
solforge airdrop
```

### 🪙 Token Commands

#### Create Token

```bash
# Interactive token creation
solforge mint

# Create new token
solforge token create --decimals 9 --supply 1000000

# Clone from mainnet
solforge token clone <MINT_ADDRESS>

# Adopt mint authority
solforge token adopt-authority <MINT_ADDRESS>
```

### 📦 Program Commands

#### Clone Program

```bash
# Clone program from mainnet
solforge program clone <PROGRAM_ID>

# Clone with accounts
solforge program clone <PROGRAM_ID> --with-accounts

# Clone specific accounts
solforge program accounts clone <PROGRAM_ID> --limit 100

# Load local program
solforge program load --file ./program.so --id <PROGRAM_ID>
```

### ⚙️ Configuration Commands

#### Initialize Config

```bash
# Create default config
solforge config init

# Get config value
solforge config get server.rpcPort

# Set config value
solforge config set server.rpcPort 9999
```

## 📝 Configuration File

Create `sf.config.json` in your project root:

```json
{
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
  },
  "svm": {
    "initialLamports": "1000000000000000",
    "faucetSOL": 1000
  },
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com",
    "programs": [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "11111111111111111111111111111111"
    ],
    "tokens": ["So11111111111111111111111111111111111111112"],
    "programAccounts": [
      {
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "limit": 10
      }
    ]
  },
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "bootstrap": {
    "airdrops": [
      {
        "address": "YOUR_WALLET_ADDRESS",
        "amountSol": 100
      }
    ]
  }
}
```

### 🔑 Configuration Options

| Option                | Description                                 | Default                               |
| --------------------- | ------------------------------------------- | ------------------------------------- |
| `server.rpcPort`      | HTTP RPC port                               | `8899`                                |
| `server.wsPort`       | WebSocket port                              | `8900`                                |
| `server.network`      | Bind to `0.0.0.0` for LAN access            | `false`                               |
| `svm.initialLamports` | Initial lamports for accounts               | `1000000000000000`                    |
| `svm.faucetSOL`       | SOL amount per airdrop                      | `1000`                                |
| `clone.endpoint`      | RPC endpoint for cloning                    | `https://api.mainnet-beta.solana.com` |
| `clone.programs`      | Program IDs to clone on startup             | `[]`                                  |
| `clone.tokens`        | Token mints to clone on startup             | `[]`                                  |
| `gui.enabled`         | Enable web GUI                              | `true`                                |
| `gui.port`            | GUI port                                    | `42069`                               |
| `bootstrap.airdrops`  | Auto-airdrops on startup                    | `[]`                                  |

## 🌍 Environment Variables

Override configuration with environment variables:

```bash
# Server settings
export RPC_PORT=8899
export SOLFORGE_GUI_PORT=3000

# Debug mode
export DEBUG_RPC_LOG=1  # Log all RPC calls

# Start with env vars
solforge start
```

## 🔌 Integration Examples

### Anchor Framework

Configure `Anchor.toml`:

```toml
[provider]
cluster = "http://127.0.0.1:8899"
wallet = "~/.config/solana/id.json"

[scripts]
test = "solforge start && anchor test --skip-local-validator"
```

### @solana/web3.js

```javascript
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// Request airdrop
const signature = await connection.requestAirdrop(
  new PublicKey("YOUR_WALLET"),
  100 * LAMPORTS_PER_SOL,
);

// Get balance
const balance = await connection.getBalance(publicKey);
```

### @solana/kit (Recommended)

```typescript
import { createSolanaRpc } from "@solana/kit";
import { address, lamports } from "@solana/web3.js";

const rpc = createSolanaRpc("http://127.0.0.1:8899");

// Request airdrop
await rpc
  .requestAirdrop(address("YOUR_WALLET"), lamports(1_000_000_000n))
  .send();

// Get balance
const balance = await rpc.getBalance(address("YOUR_WALLET")).send();
```

## 🎨 Web GUI

The built-in GUI provides:

- **📊 Dashboard**: Current slot, block height, recent transactions
- **💸 Airdrop Tool**: Quick SOL distribution interface
- **🪙 Token Minter**: Create and mint SPL tokens
- **📈 Status Monitor**: Real-time localnet statistics

Access at: `http://127.0.0.1:42069`

## 🏗️ Building from Source

### Prerequisites

- [Bun](https://bun.sh) runtime installed

### Build Steps

```bash
# Clone repository
git clone https://github.com/nitishxyz/solforge.git
cd solforge

# Install dependencies
bun install

# Run from source
bun src/cli/main.ts start

# Build binary
bun run build:bin

# Build for all platforms
bun run build:bin:all
```

### Platform-Specific Builds

```bash
# macOS (Apple Silicon)
bun run build:bin:darwin-arm64

# macOS (Intel)
bun run build:bin:darwin-x64

# Linux x64
bun run build:bin:linux-x64

# Linux ARM64
bun run build:bin:linux-arm64

# Windows
bun run build:bin:windows-x64
```

## 🗂️ Project Structure

```
solforge/
├── src/
│   ├── cli/           # CLI commands and routing
│   ├── config/        # Configuration management
│   ├── db/            # Database schemas and operations
│   ├── rpc/           # RPC server bootstrap
│   └── gui/           # Web GUI (React)
├── server/
│   ├── methods/       # RPC method implementations
│   ├── lib/           # Shared utilities
│   └── types.ts       # TypeScript definitions
├── scripts/           # Build and setup scripts
└── sf.config.json     # Configuration file
```

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Use different port
solforge start --port 9999

# Or update config
solforge config set server.rpcPort 9999
```

### GUI Not Loading

```bash
# Check if port is available
lsof -i :42069

# Use different GUI port
export SOLFORGE_GUI_PORT=3000
solforge start
```



### Connection Refused

```bash
# Verify server is running
curl http://127.0.0.1:8899/health

# Check logs with debug mode
DEBUG_RPC_LOG=1 solforge start
```

## 📊 Performance Comparison

| Metric           | SolForge | solana-test-validator |
| ---------------- | -------- | --------------------- |
| Startup Time     | < 1s     | 10-30s                |
| Memory Usage     | ~50MB    | 500MB+                |
| CPU Usage (idle) | < 1%     | 5-10%                 |
| Airdrop Speed    | Instant  | Rate limited          |
| Program Deploy   | < 100ms  | 1-2s                  |

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

```bash
# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format
```

## 📚 API Coverage

### ✅ Fully Implemented (90+ methods)

- Account operations
- Transaction submission/simulation
- Block/slot queries
- Token operations
- Program deployment
- WebSocket subscriptions (signatures)

### 🚧 Partial Support

- Stake operations
- Vote accounts
- Advanced subscriptions

### 📋 Planned

- Snapshot/restore
- Time-travel debugging
- Multi-tenant support

## 🛠️ Advanced Usage

### Custom Program Development

```bash
# Deploy custom program
solana program deploy ./my-program.so

# Clone and modify existing program
solforge program clone <PROGRAM_ID>
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Setup SolForge
  run: |
    curl -fsSL https://install.solforge.sh | sh
    solforge start &
    sleep 2

- name: Run Tests
  run: |
    anchor test --skip-local-validator
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub**: [github.com/nitishxyz/solforge](https://github.com/nitishxyz/solforge)
- **Issues**: [Report bugs or request features](https://github.com/nitishxyz/solforge/issues)
- **Discord**: [Join our community](#) _(coming soon)_

## 🙏 Acknowledgments

- Built on [LiteSVM](https://github.com/litesvm/litesvm) - Fast SVM implementation
- Powered by [Bun](https://bun.sh) - All-in-one JavaScript runtime
- Inspired by the Solana developer community

---

<p align="center">
  Made with ❤️ for Solana developers
</p>
