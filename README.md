# SolForge – Lightning-Fast Solana Development Server

A blazing-fast, drop-in replacement for `solana-test-validator` built on LiteSVM. Get a full Solana development environment running in under 1 second with comprehensive RPC support and zero configuration.

## 🚀 Why SolForge?

| Feature           | solana-test-validator | SolForge         |
| ----------------- | --------------------- | ---------------- |
| **Startup Time**  | 10-30 seconds         | < 1 second       |
| **Memory Usage**  | 500MB+                | ~50MB            |
| **Configuration** | Complex setup         | Zero config      |
| **Airdrops**      | Rate limited          | Unlimited        |
| **Database**      | Full ledger           | Ephemeral SQLite |

## ✨ Features

- ⚡ **Sub-second startup** with LiteSVM in-memory execution
- 🔄 **Drop-in replacement** for solana-test-validator
- 💧 **Unlimited airdrops** via real faucet transfers
- 🗃️ **Smart persistence** with ephemeral SQLite + Drizzle
- 🔌 **WebSocket support** for signature subscriptions
- 🧰 **Universal compatibility** with Solana CLI, Anchor, @solana/kit, web3.js
- 📊 **Rich RPC coverage** (90+ methods implemented)
- 🖥️ **Built-in GUI dashboard** for airdrops, mints, and asset management
- 🎯 **CLI tools** for tokens, programs, and accounts

## 📦 Installation & Quick Start

### Option 1: From Source (Recommended)

```bash
# Clone and install
git clone https://github.com/nitishxyz/solforge
cd solforge
bun install

# Start the server
bun start
# or with debug logging
DEBUG_RPC_LOG=1 bun start
```

### Option 2: Compiled Binary (Coming Soon)

```bash
# Download and run
curl -L https://github.com/nitishxyz/solforge/releases/latest/download/solforge-$(uname -s)-$(uname -m) -o solforge
chmod +x solforge
./solforge  # first run guides you through setup
```

### Option 3: CLI Development

```bash
# Use the CLI directly
bun src/cli/main.ts start
bun src/cli/main.ts config init  # Create sf.config.json
```

## 🎯 Usage Examples

### With Solana CLI

```bash
# Connect to SolForge
solana config set -u http://localhost:8899

# Get unlimited airdrops
solana airdrop 1000

# Deploy programs normally
solana program deploy ./program.so
```

### With @solana/kit

```typescript
import { createSolanaRpc, generateKeyPairSigner, lamports } from "@solana/kit";

const rpc = createSolanaRpc("http://localhost:8899");

// Get account balance
const { value: balance } = await rpc.getBalance(address).send();

// Request airdrops (no limits!)
const signature = await rpc
  .requestAirdrop(
    address,
    lamports(1_000_000_000n), // 1 SOL
  )
  .send();
```

### With web3.js

```typescript
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("http://localhost:8899");

// Get account info
const accountInfo = await connection.getAccountInfo(publicKey);

// Send transaction
const signature = await connection.sendTransaction(transaction, [keypair]);
```

### With Anchor

```typescript
// anchor.toml - use default settings
[provider]
cluster = \"http://127.0.0.1:8899\"
wallet = \"~/.config/solana/id.json\"

// Deploy and test normally
anchor build
anchor deploy
anchor test --skip-local-validator  # SolForge is already running
```

## 🖥️ GUI Dashboard

Solforge ships a dark-mode dashboard that starts alongside the RPC server. By default it listens on `http://127.0.0.1:42069` and provides:

- Quick airdrops and SPL mints via a faucet-aware form.
- Live RPC metrics (slot, block height, transaction count, blockhash, faucet balance).
- Tables of cloned programs and token mints with one-click modals to import additional assets.

### Launching the Dashboard

```bash
# Run the interactive CLI (starts RPC + GUI)
bun src/cli/main.ts

# Or start directly
bun src/cli/main.ts start

# Open the dashboard
open http://127.0.0.1:42069
```

### GUI API Endpoints

The GUI server exposes REST endpoints backed by the same JSON-RPC methods:

| Method & Path             | Description                          |
| ------------------------- | ------------------------------------ |
| `GET /api/status`         | Aggregated RPC stats + faucet info   |
| `GET /api/programs`       | List the registered programs         |
| `GET /api/tokens`         | Detailed SPL mint metadata           |
| `POST /api/airdrop`       | Proxy to `requestAirdrop`            |
| `POST /api/mint`          | Proxy to `solforgeMintTo`            |
| `POST /api/clone/program` | Proxy to program clone helpers       |
| `POST /api/clone/token`   | Proxy to token clone helpers         |

Override the GUI port via `sf.config.json` (`gui.port`) or `SOLFORGE_GUI_PORT`.

Run `bun run build:css` before `bun run build:bin` to embed the latest Tailwind styles in the standalone binary.


## 🔧 Configuration

SolForge works with zero configuration, but can be customized via environment variables or config file.

### Environment Variables

```bash
# Server settings
export RPC_PORT=8899              # HTTP port (WS uses port+1)
export DEBUG_RPC_LOG=1            # Log all RPC calls

# Database
export SOLFORGE_DB_MODE=ephemeral # or 'persistent'
export SOLFORGE_DB_PATH=.solforge/db.db

# Faucet
export SOLFORGE_FAUCET_LAMPORTS=1000000000000000  # 1M SOL
```

### Config File (sf.config.json)

```bash
# Generate default config
bun src/cli/main.ts config init

# Edit configuration
bun src/cli/main.ts config set server.rpcPort 9000
bun src/cli/main.ts config get server.db.mode
```

```json
{
  \"server\": {
    \"rpcPort\": 8899,
    \"wsPort\": 8900,
    \"db\": {
      \"mode\": \"ephemeral\",
      \"path\": \".solforge/db.db\"
    }
  },
  \"svm\": {
    \"initialLamports\": \"1000000000000000\",
    \"faucetSOL\": 1000
  },
  \"clone\": {
    \"endpoint\": \"https://api.mainnet-beta.solana.com\",
    \"programs\": [],
    \"tokens\": [],
    \"programAccounts\": []
  },
  \"gui\": {
    \"enabled\": true,
    \"port\": 42069
  },
  \"bootstrap\": {
    \"airdrops\": []
  }
}
```

## 🛠️ CLI Tools

SolForge includes powerful CLI tools for development:

```bash
# Airdrop SOL to any address
bun src/cli/main.ts airdrop --to <pubkey> --sol 100

# Interactive token minting
bun src/cli/main.ts mint

# Clone mainnet programs and data
bun src/cli/main.ts program clone <program-id>
bun src/cli/main.ts token clone <mint-address>

# Manage configuration
bun src/cli/main.ts config init
bun src/cli/main.ts config set server.rpcPort 9000
```

## 📡 RPC Method Coverage

### ✅ Fully Implemented (90+ methods)

**Account Operations**

- `getAccountInfo`, `getMultipleAccounts`, `getBalance`
- `getParsedAccountInfo`, `getProgramAccounts`

**Transaction Operations**

- `sendTransaction`, `simulateTransaction`, `getTransaction`
- `getSignatureStatuses`, `getSignaturesForAddress`

**Block & Slot Operations**

- `getLatestBlockhash`, `getBlock`, `getBlocks`, `getBlockHeight`
- `getSlot`, `getSlotLeader`, `getSlotLeaders`

**System & Network**

- `getHealth`, `getVersion`, `getGenesisHash`, `getEpochInfo`
- `getSupply`, `getInflationRate`, `getVoteAccounts`

**Fee Operations**

- `getFeeForMessage`, `getFees`, `getRecentPrioritizationFees`

**WebSocket Subscriptions**

- `signatureSubscribe/Unsubscribe` ✅ (real-time notifications)
- Other subscriptions (stubbed but functional)

### ⚠️ Minimal/Stubbed

- Token-specific RPCs (returns defaults unless indexed)
- Some advanced cluster RPCs (simplified for local dev)

## 💾 Data & Persistence

### Ephemeral Mode (Default)

- SQLite database recreated on each restart
- Perfect for testing and development
- Stores full transaction history during session

### Persistent Mode

```bash
# Enable persistent storage
export SOLFORGE_DB_MODE=persistent
bun start
```

### Database Schema

```sql
-- Transactions with full metadata
CREATE TABLE transactions (
  signature TEXT PRIMARY KEY,
  slot INTEGER,
  raw_transaction BLOB,  -- Full transaction data
  logs TEXT,            -- JSON array of logs
  status TEXT,          -- success/error
  fee INTEGER,
  timestamp INTEGER
);

-- Account snapshots
CREATE TABLE accounts (
  address TEXT PRIMARY KEY,
  lamports INTEGER,
  owner TEXT,
  data_len INTEGER,
  last_slot INTEGER
);

-- Address to signature mapping
CREATE TABLE address_signatures (
  address TEXT,
  signature TEXT,
  slot INTEGER
);
```

## 🔌 WebSocket Support

```javascript
const ws = new WebSocket("ws://localhost:8900");

// Subscribe to signature updates
ws.send(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "signatureSubscribe",
    params: ["<signature>", { commitment: "confirmed" }],
  }),
);

// Receive real-time notifications
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log("Signature update:", response);
};
```

## 🧪 Testing & Validation

```bash
# Run comprehensive test suite
bun run test-client.ts

# Test specific functionality
bun test

# Validate against real programs
anchor test --skip-local-validator
```

## 🏗️ Architecture Overview

```
SolForge
├── 🧠 LiteSVM Core           # In-memory execution engine
├── 🌐 HTTP Server            # JSON-RPC over HTTP
├── 🔌 WebSocket Server       # Real-time subscriptions
├── 🗃️ SQLite + Drizzle       # Ephemeral data indexing
├── 💧 Smart Faucet          # Unlimited SOL distribution
└── 🎯 CLI Tools             # Developer utilities
```

### Key Components

- **`index.ts`**: Main server entry point
- **`server/`**: HTTP and WebSocket servers
- **`server/methods/`**: Modular RPC implementations
- **`src/cli/`**: Command-line interface
- **`src/config/`**: Configuration management
- **`src/db/`**: Database schema and operations

## 🤝 Development

### Adding New RPC Methods

1. Create method file: `server/methods/your-method.ts`
2. Implement the `RpcMethodHandler` interface
3. Export from `server/methods/index.ts`
4. Add to `rpcMethods` object

```typescript
// server/methods/your-method.ts
import type { RpcMethodHandler } from \"../types\";

export const yourMethod: RpcMethodHandler = (id, params, context) => {
  try {
    const result = context.svm.someOperation();
    return context.createSuccessResponse(id, result);
  } catch (error: any) {
    return context.createErrorResponse(id, -32603, \"Internal error\");
  }
};
```

### Project Structure

```
solforge/
├── index.ts                     # Main entry point
├── server/                      # Core server
│   ├── rpc-server.ts           # HTTP server
│   ├── ws-server.ts            # WebSocket server
│   ├── methods/                # RPC method implementations
│   │   ├── account/           # Account methods
│   │   ├── transaction/       # Transaction methods
│   │   └── index.ts          # Method registry
│   └── lib/                   # Utilities
├── src/                       # CLI and config
│   ├── cli/                  # Command-line interface
│   ├── config/               # Configuration management
│   └── db/                   # Database operations
├── test-client.ts            # Integration tests
└── docs/                     # Documentation
```

### Development Guidelines

- Use **Bun exclusively** (no npm/yarn/node)
- Keep files **under 200 lines** (split when larger)
- Follow **kebab-case** for filenames
- Write **comprehensive tests**
- Use **TypeScript strictly**

## 🐛 Troubleshooting

### Common Issues

**Server won't start**

```bash
# Check if port is in use
lsof -i :8899

# Use different port
RPC_PORT=9000 bun start
```

**Anchor deploy fails**

```bash
# Ensure relaxed validation (default)
# Check logs with debug mode
DEBUG_RPC_LOG=1 bun start
```

**WebSocket connection issues**

```bash
# WebSocket runs on RPC_PORT + 1
# Default: ws://localhost:8900
```

**Airdrop not working**

```bash
# Check faucet was created
ls .solforge/faucet.json

# Manual airdrop via CLI
bun src/cli/main.ts airdrop --to <address> --sol 10
```

## 🔮 Roadmap

### v0.3.0 - Enhanced RPC Coverage

- [ ] Complete token RPC implementations
- [ ] Advanced subscription support
- [ ] Improved error handling

### v0.4.0 - Developer Experience

- [ ] Web-based dashboard
- [ ] Time-travel debugging
- [ ] Snapshot/restore functionality

### v0.5.0 - Production Features

- [ ] Clustering support
- [ ] Metrics and monitoring
- [ ] Plugin architecture

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

We welcome contributions! Please see:

- [AGENTS.md](./AGENTS.md) - Development guidelines
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Architecture details
- [SOLFORGE.md](./SOLFORGE.md) - Vision and roadmap

## 🙏 Acknowledgments

Built with ❤️ using:

- [LiteSVM](https://github.com/litesvm/litesvm) - Fast Solana VM
- [Bun](https://bun.sh) - Lightning-fast JavaScript runtime
- [Drizzle](https://drizzle.team) - TypeScript SQL toolkit

---

**⚡ Ready to build on Solana at lightning speed?**

```bash
git clone https://github.com/nitishxyz/solforge
cd solforge && bun install && bun start
```

_Happy coding! 🦀_
