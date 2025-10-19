---
title: Development
description: Contributing to SolForge
---

# Contributing to SolForge

Guide for contributing to SolForge development.

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- Git

### Clone and Install

```bash
git clone https://github.com/nitishxyz/solforge.git
cd solforge
bun install
```

## Project Structure

```
solforge/
├── apps/
│   ├── cli/              # Main CLI
│   │   ├── commands/     # CLI commands
│   │   ├── config/       # Config management
│   │   └── services/     # Core services
│   ├── web/              # React dashboard
│   └── website/          # Documentation (Astro)
├── packages/
│   ├── server/           # RPC server (LiteSVM)
│   └── install/          # Installation CLI
└── docs/
```

## Development Workflow

### Run from Source

```bash
# Run CLI
bun apps/cli/index.ts start

# Run with args
bun apps/cli/index.ts token clone <MINT>
```

### Build Binary

```bash
cd apps/cli
bun run build:bin

# Binary in ./bin/
./bin/solforge-<platform>-<arch>
```

### Run Tests

```bash
bun test
```

## Code Guidelines

See [AGENTS.md](https://github.com/nitishxyz/solforge/blob/main/AGENTS.md) for detailed guidelines.

### Key Principles

1. **Use Bun** - No npm, yarn, pnpm
2. **Keep it modular** - Files < 200 lines
3. **kebab-case** - All filenames
4. **Keep it fast** - Performance matters

### File Naming

```
✅ get-account-info.ts
✅ token-cloner.ts
❌ getAccountInfo.ts
❌ TokenCloner.ts
```

## Adding Features

### New CLI Command

1. Create file in `apps/cli/src/cli/commands/`
2. Add to `apps/cli/src/cli/main.ts`
3. Add tests
4. Update documentation

### New RPC Method

1. Create file in `packages/server/src/methods/`
2. Register in method router
3. Add tests
4. Update docs

## Documentation

Docs are in `apps/website/src/content/docs/`

Built with Astro:

```bash
cd apps/website
bun install
bun dev
```

## Submitting Changes

### Commit Messages

Use conventional commits:

```bash
feat: add getTokenAccounts RPC method
fix: handle empty transaction array
docs: update configuration reference
refactor: split account methods
```

### Pull Request

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update docs
6. Submit PR

## Review Process

- Code quality check
- Test coverage
- Documentation
- Performance impact

## Release Process

1. Version bump in package.json
2. Update CHANGELOG
3. Tag release
4. Build binaries (automated)
5. Publish to npm

## Getting Help

- [GitHub Discussions](https://github.com/nitishxyz/solforge/discussions)
- [Discord](#) (coming soon)

## License

MIT - see [LICENSE](https://github.com/nitishxyz/solforge/blob/main/LICENSE)
