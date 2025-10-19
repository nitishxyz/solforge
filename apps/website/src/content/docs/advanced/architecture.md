---
title: Architecture
description: System design and architecture of SolForge
---

# Architecture

SolForge is built as a modular system combining multiple components.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SolForge CLI                          │
│  Entry point - orchestrates all components                  │
└───────────┬─────────────────────────────────────────────────┘
            │
            ├──> 🚀 LiteSVM RPC Server
            │    • Full Solana RPC API (90+ methods)
            │    • WebSocket subscriptions
            │    • ~50MB memory, sub-second startup
            │
            ├──> 🎨 Web Dashboard
            │    • React + TypeScript + Vite
            │    • Real-time monitoring
            │    • Token & airdrop tools
            │    • AGI chat sidebar integration
            │
            └──> 🤖 AGI Server
                 • Embedded AI assistant
                 • Multi-provider support
                 • Specialized Solana agents
                 • REST API + SSE streaming
```

## Components

### 1. CLI (`apps/cli`)
- Command-line interface
- Configuration management
- Process orchestration
- Bootstrap tasks

### 2. RPC Server (LiteSVM-based)
- JSON-RPC HTTP server
- WebSocket server for subscriptions
- Database layer (ephemeral/persistent)
- SVM execution environment

### 3. Web Dashboard (`apps/web`)
- React + TanStack Router
- Real-time data updates
- Token/airdrop management UI
- AGI chat integration

### 4. AGI Server (`@agi-cli/server`)
- Embedded AI assistant
- Provider abstraction (OpenRouter, Anthropic, OpenAI)
- Agent system for specialized tasks
- Web UI for standalone access

## Data Flow

### Transaction Processing

1. Client sends transaction to RPC
2. RPC validates and processes via SVM
3. Transaction stored in database
4. WebSocket subscribers notified
5. GUI updates in real-time

### Program Cloning

1. CLI fetches program from mainnet RPC
2. Program account data retrieved
3. Account created in local SVM
4. Added to config for persistence

### Token Minting

1. User requests mint via CLI/GUI
2. SPL Token instruction created
3. Processed through SVM
4. ATA created/updated
5. Balance reflected immediately

## Technology Stack

- **Runtime**: Bun (JavaScript/TypeScript)
- **SVM**: LiteSVM (Rust, via WASM/native)
- **Database**: SQLite (optional, persistent mode)
- **Frontend**: React + Vite + TanStack
- **AI**: @agi-cli framework

## Performance Characteristics

### Startup
- RPC Server: < 100ms
- WebSocket: < 50ms
- GUI: < 500ms (build time)
- AGI: < 500ms

### Resource Usage
- Memory: ~50MB base + ~1MB per 1000 accounts
- CPU: < 1% idle, 5-10% under load
- Disk: Ephemeral = 0, Persistent = ~10MB + data

## Deployment Modes

### Development
- Ephemeral database
- All services enabled
- Debug logging available

### CI/CD
- Non-interactive (`--ci`)
- Minimal logging
- Fast startup priority

### Production Testing
- Persistent database
- GUI optional
- AGI optional

## Extension Points

### Custom RPC Methods
Add custom methods in server package.

### AI Agents
Define specialized agents for domain-specific tasks.

### GUI Plugins
Extend dashboard with custom panels.

See [Development](/advanced/development) for contributing.
