---
title: Anchor Integration
description: Using SolForge with Anchor framework
---

# Anchor Integration

SolForge is a drop-in replacement for `solana-test-validator` in Anchor projects.

## Setup

### 1. Configure Anchor.toml

```toml
[provider]
cluster = "http://127.0.0.1:8899"
wallet = "~/.config/solana/id.json"

[programs.localnet]
my_program = "YourProgramIDHere"

[scripts]
test = "bun run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```
test = "anchor test --skip-local-validator"

### 2. Start SolForge

```bash
# Terminal 1
solforge
```

### 3. Run Anchor Commands

```bash
# Build
anchor build

# Deploy
anchor deploy

# Test (skip built-in validator)
anchor test --skip-local-validator
```

## Testing Pattern

```bash
# Keep SolForge running
solforge

# In another terminal
anchor test --skip-local-validator
```

## Benefits vs solana-test-validator

- **10-30x faster startup** (< 1s vs 10-30s)
- **90% less memory** (~50MB vs 500MB+)
- **Unlimited airdrops** (no rate limits)
- **Web GUI** for visual debugging
- **AI assistance** built-in

## Example Test

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";
import { expect } from "chai";

describe("my-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MyProgram as Program<MyProgram>;

  it("Works with SolForge", async () => {
    // Your test code here
    const tx = await program.methods.initialize().rpc();
    expect(tx).to.be.a("string");
  });
});
```

See [First Project](/getting-started/first-project) for complete examples.
