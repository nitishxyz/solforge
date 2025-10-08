# SolForge Project Structure

## Current Architecture

```
solforge/
├── index.ts                    # Legacy entry point
├── apps/
│   ├── cli/                    # CLI application
│   │   ├── index.ts            # CLI entry point
│   │   └── src/                # Commands, services, RPC bootstrap
│   └── web/                    # Web UI (in development)
├── packages/
│   ├── server/                 # LiteSVM RPC + WS servers
│   │   └── src/
│   │       ├── index.ts        # Module exports
│   │       ├── rpc-server.ts   # RPC server implementation
│   │       ├── ws-server.ts    # WebSocket server
│   │       ├── types.ts        # Shared RPC types
│   │       ├── lib/            # Helpers (base58, faucet, etc.)
│   │       └── methods/        # JSON-RPC methods
│   └── install/                # Installer package
├── scripts/                    # Build and setup scripts
├── drizzle/                    # SQLite migrations
├── docs/                       # Documentation
└── SOLFORGE.md                 # Project vision and roadmap
```

## Module Organization

### When to Split Files

Files start as single modules and split when they exceed 200 lines:

```
Initial: methods/category.ts (< 200 lines)
    ↓
Growth: methods/category.ts (> 200 lines)
    ↓
Split: methods/category/
       ├── index.ts
       ├── method-one.ts
       ├── method-two.ts
       └── method-three.ts
```

### Current Status

- ✅ **Account methods**: Already modularized (4 methods)
- 📦 **Transaction methods**: Single file (4 methods, ~145 lines)
- 📦 **Block methods**: Single file (3 methods, ~20 lines)
- 📦 **System methods**: Single file (3 methods, ~27 lines)

### Adding New Methods

1. **Determine category** (account/transaction/block/system/custom)
2. **Check file size** of target category
3. **If < 200 lines**: Add to existing file
4. **If > 200 lines**: Create subdirectory structure
5. **Follow template** in `packages/server/src/methods/TEMPLATE.md`
6. **Register method** in `packages/server/src/methods/index.ts`
7. **Update documentation**

## Key Files

### Core Components

- `packages/server/src/rpc-server.ts`: Main server class, handles routing
- `packages/server/src/types.ts`: TypeScript interfaces for RPC
- `packages/server/src/methods/index.ts`: Method registry and exports

### Configuration

- `package.json`: Dependencies (minimal, Bun-focused)
- `tsconfig.json`: TypeScript settings

### Documentation

- `SOLFORGE.md`: What we're building and why
- `AGENTS.md`: How to develop for SolForge
- `README.md`: User-facing documentation
- `PROJECT_STRUCTURE.md`: This file

## Naming Conventions

- **Files**: `kebab-case.ts`
- **Directories**: `kebab-case/`
- **Exports**: `camelCase`
- **Types/Interfaces**: `PascalCase`

## Import Hierarchy

```typescript
// 1. External packages
import { PublicKey } from "@solana/web3.js";

// 2. Internal modules
import { helper } from "../utils";

// 3. Types
import type { RpcMethodHandler } from "../types";
```

## Future Growth

As we add more RPC methods, the structure under `packages/server/src/methods/` will evolve:

```
methods/
├── account/          # 10+ methods
├── transaction/      # 8+ methods  
├── block/           # 5+ methods
├── system/          # 6+ methods
├── token/           # Future: SPL token methods
├── stake/           # Future: Staking methods
├── vote/            # Future: Vote methods
└── deprecated/      # Future: Legacy compatibility
```

Each category becomes modular when it reaches complexity threshold.