---
title: AI Assistant
description: Integrated AI coding assistant powered by Claude, GPT-4, or your choice of LLM
---

# AI Assistant

SolForge includes an integrated AI assistant for Solana development.

## Features

### 🐛 Debug Programs
```
"Why is my PDA derivation failing?"
"Explain this transaction error: Program failed to complete"
```

### 📝 Generate Code
```
"Create an Anchor program for token staking"
"Write a TypeScript client for my NFT program"
```

### 🎓 Learn Solana
```
"What's the difference between a PDA and a keypair?"
"How do cross-program invocations work?"
```

### 🔍 Review & Optimize
```
"Review this program for security issues"
"How can I optimize these compute units?"
```

## Quick Start

Add to `sf.config.json`:

```json
{
  "agi": {
    "enabled": true
  }
}
```

Start SolForge:

```bash
solforge
```

Access AI:
- Web Dashboard: `http://127.0.0.1:42069` (sidebar)
- Standalone UI: `http://127.0.0.1:3456/ui`

## Configuration

See [AI Providers](/ai/providers) for detailed provider setup.

## Use Cases

- Debug transaction errors
- Explain Solana concepts
- Generate boilerplate code
- Review security
- Optimize performance
- Learn best practices

## Related

- [AI Quickstart](/ai/quickstart)
- [AI Providers](/ai/providers)
- [Configuration](/config/reference)
