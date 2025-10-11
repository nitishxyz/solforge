# AGI Server Quick Start for Solforge

## Current Status ✅
AGI server integration is now complete! The server will start automatically when you run Solforge.

## How to Enable AGI

### 1. Update your `sf.config.json`

Change the `agi` section to enable it:

```json
{
  "agi": {
    "enabled": true,
    "port": 3456,
    "host": "127.0.0.1",
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "agent": "build"
  }
}
```

### 2. Set Your API Key

Export your API key as an environment variable:

```bash
# For OpenRouter (recommended - single key for many models)
export OPENROUTER_API_KEY=your-key-here

# Or for Anthropic
export ANTHROPIC_API_KEY=your-key-here

# Or for OpenAI
export OPENAI_API_KEY=your-key-here
```

**Get API Keys:**
- OpenRouter: https://openrouter.ai/ (recommended)
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/

### 3. Start Solforge

```bash
bun run apps/cli/index.ts
```

You should see output like:

```
🤖 AGI Server started on port 3456
   Provider: openrouter | Model: anthropic/claude-3.5-sonnet
Solforge ready ➜ HTTP http://127.0.0.1:8899 | WS ws://127.0.0.1:8900 | GUI http://127.0.0.1:42069 | AGI http://127.0.0.1:3456/ui
```

### 4. Access the AGI Web UI

Open in your browser:
```
http://127.0.0.1:3456/ui
```

## Configuration Options

### Provider Options

**OpenRouter (Recommended)**
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3.5-sonnet"
}
```
Other models: `openai/gpt-4-turbo`, `meta-llama/llama-3-70b`, etc.

**Anthropic**
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

**OpenAI**
```json
{
  "provider": "openai",
  "model": "gpt-4-turbo"
}
```

### Agent Types

- **`general`**: For general Solana development and debugging
- **`build`**: For build processes and deployment tasks

## Network Mode

To make AGI accessible on your network:

```bash
bun run apps/cli/index.ts --network
```

This binds to `0.0.0.0` so you can access from other devices:
```
http://your-ip:3456/ui
```

## Troubleshooting

### AGI Server Won't Start

1. **Check if API key is set:**
   ```bash
   echo $OPENROUTER_API_KEY
   ```

2. **Check if port 3456 is available:**
   ```bash
   lsof -i :3456
   ```

3. **Enable debug mode:**
   ```bash
   bun run apps/cli/index.ts --debug
   ```

### No Output After Start

Make sure:
- `agi.enabled` is `true` in `sf.config.json`
- Your API key environment variable is set
- The provider name matches (case-sensitive)

## Example: Full Working Config

```json
{
  "name": "solforge-with-agi",
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": {
      "mode": "folder",
      "path": ".solforge/db"
    }
  },
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "agi": {
    "enabled": true,
    "port": 3456,
    "host": "127.0.0.1",
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "agent": "general"
  },
  "tokens": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC"
    }
  ]
}
```

## What You Can Do with AGI

1. **Debug Solana programs** - Paste error messages and get AI assistance
2. **Generate code** - Ask for Solana program templates
3. **Learn Solana** - Ask questions about PDAs, CPIs, accounts, etc.
4. **Review code** - Get suggestions for improvements
5. **Deployment help** - Build agent helps with deployment tasks

## Cost Considerations

Typical costs (varies by provider):
- **OpenRouter (Claude 3.5 Sonnet)**: ~$3 input / $15 output per 1M tokens
- **Anthropic (Claude 3.5 Sonnet)**: $3 input / $15 output per 1M tokens
- **OpenAI (GPT-4)**: $10-30 input / $30-60 output per 1M tokens

💡 **Tip**: A typical conversation uses 1,000-10,000 tokens, costing $0.01-$0.20

## Security Notes

⚠️ **Important:**
1. Never commit API keys to git
2. Use environment variables for API keys
3. Only use `--network` on trusted networks
4. Monitor your API usage and costs

## Need Help?

See full documentation: [docs/AGI_INTEGRATION.md](docs/AGI_INTEGRATION.md)
