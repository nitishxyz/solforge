# 🔥 SolForge

> **AI-Powered Solana Development Suite** 🤖⚡  
> The next-generation Solana development environment combining blazing-fast localnet performance with integrated AI assistance. Build faster, debug smarter, ship sooner.

[![Version](https://img.shields.io/badge/version-0.2.18-blue)](https://github.com/nitishxyz/solforge)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Powered by LiteSVM](https://img.shields.io/badge/powered%20by-LiteSVM-purple)](https://github.com/litesvm/litesvm)
[![AI Enabled](https://img.shields.io/badge/AI-enabled-orange)](AGI_QUICKSTART.md)

---

## 🎯 What is SolForge?

SolForge started as a lightning-fast alternative to `solana-test-validator`, but has evolved into something far more powerful: **a complete AI-powered Solana development suite** that combines:

- 🚀 **Ultra-Fast Localnet** - Sub-second startup (~50MB vs 500MB+)
- 🤖 **Integrated AI Assistant** - Built-in coding assistant powered by Claude, GPT-4, or your choice of LLM
- 🎨 **Modern Web Dashboard** - Full-featured GUI with AI chat sidebar
- 🛠️ **Complete Dev Toolkit** - Program cloning, token minting, unlimited airdrops
- 🔌 **Drop-in Compatible** - Works with Anchor, web3.js, @solana/kit, and all existing tooling

**Think of it as:** Your localnet, your dev tools, and your AI pair programmer—all in one command.

---

## ✨ Why SolForge?

### The All-in-One Development Suite

| Feature | SolForge | solana-test-validator |
|---------|----------|----------------------|
| **Startup Time** | < 1s | 10-30s |
| **Memory Usage** | ~50MB | 500MB+ |
| **AI Assistant** | ✅ Built-in | ❌ None |
| **Web Dashboard** | ✅ Modern React UI | ❌ CLI only |
| **Program Cloning** | ✅ One command | ❌ Manual |
| **Token Cloning** | ✅ Automatic | ❌ Complex |
| **Unlimited Airdrops** | ✅ Instant | ⚠️ Rate limited |
| **WebSocket Support** | ✅ Real-time | ✅ Yes |

---

## 🚀 Quick Start

### Installation

```bash
# One-liner install (recommended)
curl -fsSL https://install.solforge.sh | sh

# Or with Bun
bun install -g solforge

# Or with npm
npm install -g solforge
```

### Start Everything

```bash
# Initialize config
solforge init

# Start localnet + AI + web dashboard
solforge start
```

This launches:
- 🌐 **RPC Server**: `http://127.0.0.1:8899`
- 📡 **WebSocket**: `ws://127.0.0.1:8900`
- 🎨 **Web Dashboard**: `http://127.0.0.1:42069`
- 🤖 **AI Assistant**: `http://127.0.0.1:3456/ui` _(if enabled)_

### Get Coding in 30 Seconds

```bash
# Configure Solana CLI
solana config set -u http://127.0.0.1:8899

# Get some SOL
solana airdrop 1000

# You're ready! 🎉
```

---

## 🤖 AI-Powered Development

### Enable the AI Assistant

Add this to your `sf.config.json`:

```json
{
  "agi": {
    "enabled": true
  }
}
```

That's it! The AI server starts automatically with smart defaults. No API keys required initially (uses AGI's defaults).

### What Can the AI Do?

1. **🐛 Debug Your Programs**
   ```
   "Why is my PDA derivation failing?"
   "Explain this transaction error: Program failed..."
   ```

2. **📝 Generate Code**
   ```
   "Create an Anchor program for a token swap"
   "Write a TypeScript client for my NFT program"
   ```

3. **🎓 Learn Solana**
   ```
   "What's the difference between a PDA and a keypair?"
   "How do cross-program invocations work?"
   ```

4. **🔍 Review & Optimize**
   ```
   "Review this program for security issues"
   "How can I optimize these compute units?"
   ```

5. **🚀 Deployment Help**
   ```
   "Deploy this program to devnet"
   "Set up CI/CD for my Anchor project"
   ```

### Access the AI

- **Web Dashboard**: Built-in chat sidebar at `http://127.0.0.1:42069`
- **Standalone UI**: Direct access at `http://127.0.0.1:3456/ui`
- **API**: Programmatic access via REST/SSE endpoints

📖 **Detailed Guide**: [AGI_QUICKSTART.md](AGI_QUICKSTART.md)

---

## 🎨 Web Dashboard

The modern web interface combines all your dev tools in one place:

### Features
- 📊 **Real-time Monitoring** - Slots, blocks, transactions
- 💸 **Instant Airdrops** - Visual SOL distribution
- 🪙 **Token Management** - Create, clone, and mint tokens
- 🤖 **AI Chat Sidebar** - Get help without leaving your workspace
- 🔍 **Transaction Inspector** - Debug transactions visually
- 📈 **Network Stats** - Live performance metrics

Access at `http://127.0.0.1:42069` when SolForge is running.

---

## 🛠️ Complete Development Toolkit

### Program Development

```bash
# Clone programs from mainnet
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

# Clone with all associated accounts
solforge program clone <PROGRAM_ID> --with-accounts

# Load your own program
solforge program load --file ./target/deploy/my_program.so
```

### Token Operations

```bash
# Clone USDC to localnet
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Create new token with metadata
solforge mint

# Interactive token creation wizard
solforge token create
```

### Instant Airdrops

```bash
# No rate limits, no waiting
solforge airdrop --to <PUBKEY> --sol 1000

# Or use the web dashboard for visual control
```

---

## 📝 Configuration

Create `sf.config.json` to customize everything:

```json
{
  "name": "my-solana-project",
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
    "port": 3456,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "clone": {
    "programs": [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ],
    "tokens": [
      {
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "symbol": "USDC"
      }
    ]
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

### Configuration Options

| Section | Purpose | Docs |
|---------|---------|------|
| `server` | RPC/WebSocket ports | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |
| `gui` | Web dashboard settings | [apps/web/README.md](apps/web/README.md) |
| `agi` | AI assistant configuration | [AGI_QUICKSTART.md](AGI_QUICKSTART.md) |
| `clone` | Auto-clone programs/tokens | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |
| `bootstrap` | Auto-airdrops on startup | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |

---

## 🔌 Framework Integration

### Anchor

```toml
# Anchor.toml
[provider]
cluster = "http://127.0.0.1:8899"
wallet = "~/.config/solana/id.json"

[scripts]
test = "solforge start && anchor test --skip-local-validator"
```

### @solana/web3.js

```typescript
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// Request airdrop
await connection.requestAirdrop(
  new PublicKey("YOUR_WALLET"),
  100 * LAMPORTS_PER_SOL
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
  .requestAirdrop(address("YOUR_WALLET"), lamports(100_000_000_000n))
  .send();

// Get balance
const balance = await rpc.getBalance(address("YOUR_WALLET")).send();
```

---

## 📊 Performance & Comparison

### Speed Matters

```bash
# solana-test-validator
$ time solana-test-validator
Startup: ~15-30 seconds
Memory: 500-800 MB
CPU: 5-10% idle

# SolForge
$ time solforge start
Startup: < 1 second
Memory: ~50 MB
CPU: < 1% idle
```

### Why It's Fast

- **LiteSVM**: Built on an optimized Solana Virtual Machine implementation
- **Minimal Overhead**: No unnecessary validators or consensus
- **Efficient Architecture**: Bun runtime + smart resource management
- **Optimized RPC**: Direct SVM access without validator overhead

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SolForge CLI                          │
│  Entry point - orchestrates all components                  │
└───────────┬─────────────────────────────────────────────────┘
            │
            ├──> 🚀 LiteSVM RPC Server (packages/server)
            │    • Full Solana RPC API (90+ methods)
            │    • WebSocket subscriptions
            │    • ~50MB memory, sub-second startup
            │
            ├──> 🎨 Web Dashboard (apps/web)
            │    • React + TypeScript + Vite
            │    • Real-time monitoring
            │    • Token & airdrop tools
            │    • AGI chat sidebar integration
            │
            └──> 🤖 AGI Server (@agi-cli/server)
                 • Embedded AI assistant
                 • Multi-provider support (OpenRouter, Anthropic, OpenAI)
                 • Specialized Solana development agents
                 • REST API + SSE streaming
```

### Project Structure

```
solforge/
├── apps/
│   ├── cli/              # Main CLI entry point
│   │   ├── commands/     # start, init, mint, etc.
│   │   ├── services/     # Process management, token cloning
│   │   └── config/       # Configuration management
│   └── web/              # React dashboard
│       ├── components/   # UI components + AGI sidebar
│       └── routes/       # Dashboard pages
├── packages/
│   ├── server/           # LiteSVM RPC/WebSocket server
│   │   ├── methods/      # 90+ RPC method implementations
│   │   └── ws-server/    # WebSocket subscription server
│   └── install/          # Installation CLI
└── docs/                 # Architecture & guides
```

---

## 🎓 Use Cases

### For Hackathons 🏆
- **Fast Iteration**: Sub-second restart means rapid development
- **AI Pair Programming**: Debug faster with integrated AI
- **Complete Toolkit**: Everything you need in one tool
- **Visual Debugging**: Web dashboard for real-time insights

### For Learning 📚
- **Beginner Friendly**: AI explains Solana concepts as you code
- **Interactive**: Web GUI makes concepts visual
- **Fast Feedback**: Instant airdrops and program deployment
- **Production-Ready**: Same RPC API as mainnet

### For Teams 👥
- **Consistent Environments**: Same config across all devs
- **Faster Onboarding**: One command to start developing
- **AI Knowledge Base**: Team can query AI for project patterns
- **Remote Development**: `--network` flag for LAN access

### For CI/CD 🔄
- **Fast Tests**: Startup time doesn't bottleneck pipelines
- **Scriptable**: Full CLI automation support
- **Docker Ready**: Minimal resource footprint
- **Reliable**: Deterministic behavior for testing

---

## 📚 Documentation

**📖 [Complete Documentation](https://solforge.dev/docs)** - All documentation is now hosted on the website as a single source of truth.

Quick links:
- [AI Assistant Setup](https://solforge.dev/docs/ai/quickstart) - Enable and configure the AI
- [Configuration Reference](https://solforge.dev/docs/config/reference) - Complete sf.config.json guide
- [CLI Commands](https://solforge.dev/docs/cli/overview) - All available CLI commands

---

## 🔧 Advanced Usage

### AI Configuration

```json
{
  "agi": {
    "enabled": true,
    "port": 3456,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "agent": "general"
  }
}
```

**Supported Providers:**
- OpenRouter (recommended - access to all models with one key)
- Anthropic (Claude 3.5 Sonnet)
- OpenAI (GPT-4 Turbo)

**Agent Types:**
- `general` - General Solana development & debugging
- `build` - Build processes & deployment tasks

### Network Mode

Make your localnet accessible on your LAN:

```bash
solforge start --network
```

Now accessible at `http://YOUR_IP:8899` from other devices.

### Bootstrap Configurations

Auto-setup on every start:

```json
{
  "clone": {
    "programs": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    "tokens": [
      {
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "symbol": "USDC"
      }
    ]
  },
  "bootstrap": {
    "airdrops": [
      { "address": "YOUR_WALLET", "amountSol": 100 }
    ]
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Setup SolForge
  run: |
    curl -fsSL https://install.solforge.sh | sh
    solforge init
    solforge start &
    sleep 2

- name: Run Tests
  run: |
    anchor test --skip-local-validator
```

---

## 🏗️ Building from Source

### Prerequisites

- [Bun](https://bun.sh) runtime

### Build Commands

```bash
# Clone & install
git clone https://github.com/nitishxyz/solforge.git
cd solforge
bun install

# Run from source
bun apps/cli/index.ts start

# Build binary for your platform
bun run --filter @solforge/cli build:bin

# Build for all platforms
bun run --filter @solforge/cli build:bin:all
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

# Windows x64
bun run build:bin:windows-x64
```

---

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :8899

# Use different port
solforge start --port 9999
```

### AI Server Not Starting

```bash
# Check API key (if using specific provider)
echo $OPENROUTER_API_KEY

# Start with debug logs
solforge start --debug

# Use minimal config (no API key needed)
{
  "agi": { "enabled": true }
}
```

### GUI Not Loading

```bash
# Check if port is available
lsof -i :42069

# Use different port
export SOLFORGE_GUI_PORT=3000
solforge start
```

### Connection Refused

```bash
# Verify server is running
curl http://127.0.0.1:8899/health

# Check with debug mode
DEBUG_RPC_LOG=1 solforge start
```

---

## 📚 API Coverage

### ✅ Fully Implemented (90+ methods)

- **Account Operations**: getAccountInfo, getMultipleAccounts, getProgramAccounts
- **Transaction Processing**: sendTransaction, simulateTransaction, getTransaction
- **Block & Slot Queries**: getBlock, getSlot, getBlockHeight, getEpochInfo
- **Token Operations**: getTokenAccountsByOwner, getTokenSupply, getTokenAccountBalance
- **Program Deployment**: Full program deployment support
- **WebSocket Subscriptions**: accountSubscribe, signatureSubscribe, programSubscribe

### 🚧 In Progress

- Additional WebSocket subscription types
- Stake account operations
- Vote account queries

### 📋 Planned

- Snapshot/restore functionality
- Time-travel debugging
- Multi-tenant support
- Enhanced transaction inspection

---

## 🤝 Contributing

We welcome contributions! Whether you're:
- Adding new RPC methods
- Improving AI prompts
- Enhancing the web dashboard
- Writing documentation
- Reporting bugs

**See [AGENTS.md](AGENTS.md) for development guidelines.**

### Development Workflow

```bash
# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format
```

---

## 🙏 Acknowledgments

SolForge is built on the shoulders of giants:

- **[LiteSVM](https://github.com/litesvm/litesvm)** - Fast Solana VM implementation
- **[Bun](https://bun.sh)** - Lightning-fast JavaScript runtime
- **[@agi-cli](https://github.com/OpenAgentsInc/openagents)** - AI coding assistant framework
- **Solana Labs** - For building an incredible blockchain platform
- **The Solana Community** - For inspiration and feedback

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **GitHub**: [github.com/nitishxyz/solforge](https://github.com/nitishxyz/solforge)
- **Issues**: [Report bugs or request features](https://github.com/nitishxyz/solforge/issues)
- **Discord**: [Join our community](#) _(coming soon)_
- **Twitter**: [@solforge_dev](#) _(coming soon)_

---

## 🌟 Star History

If SolForge helps you build faster, please consider starring the repo! ⭐

---

<p align="center">
  <strong>Made with ❤️ for Solana developers</strong><br>
  <em>From a simple localnet to an AI-powered development suite</em>
</p>

<p align="center">
  <a href="#-quick-start">Get Started</a> •
  <a href="AGI_QUICKSTART.md">AI Docs</a> •
  <a href="docs/">Full Docs</a> •
  <a href="https://github.com/nitishxyz/solforge/issues">Support</a>
</p>
