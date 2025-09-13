# SolForge - Lightweight Solana RPC Server

## Vision

SolForge is a high-performance, lightweight drop-in replacement for `solana-test-validator` built on LiteSVM. Our goal is to provide developers with a fast, resource-efficient local Solana development environment that "just works."

## What We're Building

### Core Objectives

1. **Drop-in Replacement**: Full compatibility with existing Solana RPC clients and tools
2. **Blazing Fast**: Sub-second startup, minimal memory footprint (~50MB vs 500MB+)
3. **Developer First**: Zero configuration, intuitive architecture, easy to extend
4. **Production Ready**: Reliable, well-tested, suitable for CI/CD pipelines

### Key Features

- ✅ Broad Solana JSON‑RPC coverage (HTTP + PubSub for signatures)
- ⚡ In‑memory execution via LiteSVM; sub‑second startup
- 💧 Faucet-backed airdrops (real transfers, no rate limits)
- 🗃️ Ephemeral SQLite index (Bun + Drizzle) for rich history during a run
- 🔧 Modular architecture; one method per file
- 🧪 Developer‑first defaults; logs and ergonomics for local workflows
- 🎯 Bun‑native

## Architecture

```
SolForge
├── Core Server (LiteSVM wrapper)
├── RPC Method Handlers (modular)
├── State Management (LiteSVM + ephemeral DB index)
└── Extensions (plugins, custom programs)
```

### Design Principles

1. **Modularity Over Monoliths**: Small, focused modules that do one thing well
2. **Performance First**: Optimize for speed and resource usage
3. **Developer Experience**: Clear code, good documentation, helpful errors
4. **Extensibility**: Easy to add new RPC methods and custom behavior
5. **Compatibility**: Maintain strict Solana RPC API compatibility

## Roadmap

### Phase 1: Core RPC Methods ✅
- Basic account operations
- Transaction submission and simulation
- Block and slot information
- System queries

### Phase 2: Extended RPC Methods (Current)
- Token operations
- Program deployment
- Stake operations
- Vote operations
- Advanced queries

### Phase 3: WebSocket Support ✅ (signatures)
- Signature subscriptions implemented; other subs stubbed

### Phase 4: Advanced Features
- Snapshot/restore functionality
- Time travel debugging
- Custom program loader
- Performance profiling tools
- Multi-tenant support

### Phase 5: Production Features
- Clustering support
- Persistent storage option
- Metrics and monitoring
- Admin API
- Plugin system

## Use Cases

### Primary
- Local development environment
- Unit and integration testing
- CI/CD pipeline testing
- Educational purposes

### Secondary
- Performance benchmarking
- Protocol experimentation
- Custom program development
- Lightweight staging environments

## Success Metrics

- **Startup Time**: < 1 second
- **Memory Usage**: < 50MB idle, < 200MB under load
- **RPC Compatibility**: 100% core methods, 80%+ extended methods
- **Developer Adoption**: Primary choice for local Solana development
- **Test Speed**: 10x faster than solana-test-validator

## Non-Goals

- Not a production validator; not for mainnet/testnet
- Not for consensus participation
- Not for long‑term ledger persistence (DB is ephemeral by default)

## Technical Stack

- **Runtime**: Bun (exclusively)
- **Core**: LiteSVM
- **Language**: TypeScript
- **Architecture**: Modular, event-driven
- **Testing**: Bun test framework
- **Package Management**: Bun

## Contributing

We welcome contributions that align with our vision of a fast, lightweight, developer-friendly Solana RPC server. See AGENTS.md for development guidelines.

## Why "SolForge"?

Like a forge shapes raw metal into useful tools, SolForge shapes the Solana runtime into a powerful development tool - hot, fast, and ready to create.
