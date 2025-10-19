---
title: AGI Quick Start
description: Get started with AI-powered assistance in SolForge
---

# AGI Quick Start

Get SolForge's AI assistant running in under 5 minutes.

## What is AGI?

AGI (AI-Generated Intelligence) is SolForge's built-in AI assistant that helps you:

- **Build smart contracts** with conversational AI
- **Debug faster** with intelligent error analysis
- **Learn Solana** with context-aware explanations
- **Automate tasks** through natural language commands

## Quick Setup

### 1. Enable AGI

Add to your `sf.config.json`:

```json
{
  "agi": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4.5-20250514"
  }
}
```

### 2. Set Your API Key

```bash
export ANTHROPIC_API_KEY=your-key-here
```

Or use OpenRouter:

```json
{
  "agi": {
    "enabled": true,
    "port": 3456,
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4.5",
  }
}
```

```bash
export OPENROUTER_API_KEY=your-key-here
```

### 3. Start SolForge

```bash
bun run apps/cli/index.ts
```

You'll see:

```
🤖 AGI Server started on port 3456
   Provider: openrouter | Model: anthropic/claude-sonnet-4.5
   Access UI: http://127.0.0.1:3456/ui
Solforge ready ➜ HTTP http://127.0.0.1:8899 | WS ws://127.0.0.1:8900 | GUI http://127.0.0.1:42069 | AGI http://127.0.0.1:3456/ui
```

### 4. Open the UI

Visit:
```
http://127.0.0.1:3456/ui
```

🎉 You're ready! Start chatting with your AI assistant.

## Configuration Options

### Minimal (Recommended)

```json
{
  "agi": {
    "enabled": true
  }
}
```

AGI will use its built-in defaults. No API key needed!

### With Specific Provider

**OpenRouter:**
```json
{
  "agi": {
    "enabled": true,
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4.5"
  }
}
```

**Anthropic:**
```json
{
  "agi": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4.5-20250514"
  }
}
```

**OpenAI:**
```json
{
  "agi": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

### All Options

```json
{
  "agi": {
    "enabled": true,
    "port": 3456,
    "host": "127.0.0.1",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4.5",
    "agent": "general",
    "apiKey": "your-key-here"
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable AGI server |
| `port` | number | `3456` | Port to run on |
| `host` | string | `"127.0.0.1"` | Host to bind to |
| `provider` | string | _(AGI default)_ | AI provider: `openrouter`, `anthropic`, `openai` |
| `model` | string | _(AGI default)_ | Model name (varies by provider) |
| `agent` | string | `"general"` | Agent type: `general` or `build` |
| `apiKey` | string | _(from env)_ | API key (use env vars instead) |

## Remote Access

To access AGI from other devices on your network:

**1. Start with network access:**
```bash
bun run apps/cli/index.ts --network
```

**2. Visit from another device:**
```
http://your-ip:3456/ui
```

⚠️ **Security**: Only use `--network` on trusted networks.

## Troubleshooting

### "AGI server is enabled but no API key found"

You specified a `provider` but didn't set the API key.

**Fix:**
1. Remove `provider` to use AGI defaults (recommended), or
2. Set the API key for your provider

### "AGI server health check failed"

**Possible causes:**

1. **Port already in use**
   ```bash
   lsof -i :3456
   ```

2. **Missing dependencies**
   ```bash
   bun pm ls | grep agi
   ```

3. **Invalid API key**
   - Check your environment variable
   - Verify the key is active on the provider's dashboard

### "Connection refused"

The AGI server hasn't started. Check the CLI output for errors.

## What's Next?

- [Minimal Configuration Guide](./minimal-config) - Simplest setup possible
- [Full AGI Documentation](#) - Advanced features and customization
- [API Reference](#) - Integrate AGI into your tools

## Pricing

Typical costs for AI providers:

- **OpenRouter (Claude 4.5 Sonnet)**: ~$3 input / $15 output per 1M tokens
- **Anthropic (Claude 4.5 Sonnet)**: $3 input / $15 output per 1M tokens
- **OpenAI (GPT-4)**: $30 input / $60 output per 1M tokens

Most development sessions use < $0.10 worth of tokens.

## Tips

✅ **Start minimal** - Just set `enabled: true`  
✅ **Use environment variables** for API keys  
✅ **Try different models** to find what works best  
✅ **Use `--network`** only on trusted networks  
✅ **Monitor costs** through your provider's dashboard
