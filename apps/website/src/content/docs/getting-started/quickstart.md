---
title: Quick Start
description: Get up and running with SolForge in 30 seconds
---

# Quick Start

Get up and running with SolForge in 30 seconds!

## Installation

Choose your preferred method:

### One-Liner (Recommended)
```bash
curl -fsSL https://install.solforge.sh | sh
```

### With Bun
```bash
bun install -g solforge
```

### With npm
```bash
npm install -g solforge
```

## Start SolForge

```bash
# Just run solforge - it does everything!
solforge
```

This will:
1. Run interactive setup (creates `sf.config.json`)
2. Start all services automatically
```

This launches:
- 🌐 **RPC Server**: `http://127.0.0.1:8899`
- 📡 **WebSocket**: `ws://127.0.0.1:8900`
- 🎨 **Web Dashboard**: `http://127.0.0.1:42069`
- 🤖 **AI Assistant**: `http://127.0.0.1:3456/ui` _(if enabled)_

## Configure Solana CLI

```bash
solana config set -u http://127.0.0.1:8899
  "agi": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4.5-20250514"
  }
}
```

## You're Ready! 🎉

Now you can:
- Deploy programs with Anchor
- Build dApps with web3.js
- Test transactions locally
- Get AI assistance for debugging

## Next Steps

- [Create Your First Project](/getting-started/first-project)
- [Configure the AI Assistant](/ai/quickstart)
- [Explore the Web Dashboard](/core/web-dashboard)
- [Clone Mainnet Programs](/core/program-deployment)

## Quick Test

Try this to verify everything works:

```javascript
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("http://127.0.0.1:8899");
const balance = await connection.getBalance(yourPublicKey);
console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
```

## Troubleshooting

**Port already in use?**
```bash
solforge --port 9999
```

**Need to see what's running?**
```bash
solforge status
```

**Want to stop?**
```bash
solforge stop
```

For more help, see the [Troubleshooting Guide](/advanced/troubleshooting).
