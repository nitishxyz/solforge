# AGI Minimal Configuration Guide

## ✨ The Simplest Setup

You can now run AGI with just:

```json
{
  "agi": {
    "enabled": true
  }
}
```

That's it! **No need to specify provider or model** - the AGI server will use its built-in defaults.

## How It Works

When you omit `provider` and `model`, the AGI server uses its own smart defaults from `@agi-cli/server`. This means:

- ✅ Less configuration needed
- ✅ Automatic updates when AGI improves its defaults
- ✅ Works out of the box

## Configuration Options

### Minimal (Recommended)
```json
{
  "agi": {
    "enabled": true
  }
}
```

### With Port Override
```json
{
  "agi": {
    "enabled": true,
    "port": 3456
  }
}
```

### With Explicit Provider (If You Want)
```json
{
  "agi": {
    "enabled": true,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  }
}
```

**Note**: If you specify `provider`, you'll need to set the corresponding API key:
```bash
export OPENROUTER_API_KEY=your-key
```

### With API Key in Config (Not Recommended)
```json
{
  "agi": {
    "enabled": true,
    "apiKey": "your-key-here"
  }
}
```

⚠️ **Security**: It's better to use environment variables for API keys.

## All Available Options

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | `false` | Enable AGI server |
| `port` | number | No | `3456` | Port to run on |
| `host` | string | No | `"127.0.0.1"` | Host to bind to |
| `provider` | string | No | _(AGI default)_ | AI provider: `"openrouter"`, `"anthropic"`, `"openai"` |
| `model` | string | No | _(AGI default)_ | Model name (varies by provider) |
| `agent` | string | No | `"general"` | Agent type: `"general"` or `"build"` |
| `apiKey` | string | No | _(from env)_ | API key (better to use env vars) |

## When to Specify Provider/Model

You **don't need** to specify provider or model unless:

1. ✅ You want to use a **specific** model different from AGI's default
2. ✅ You have an API key for a **specific** provider
3. ✅ You want to **lock** to a particular provider/model version

Otherwise, just enable AGI and let it use its defaults!

## Examples

### Example 1: Minimal Setup (Just Enable It)

**sf.config.json:**
```json
{
  "name": "my-project",
  "agi": {
    "enabled": true
  }
}
```

**Run:**
```bash
bun run apps/cli/index.ts
```

AGI will start with its built-in defaults!

### Example 2: Change Port

**sf.config.json:**
```json
{
  "agi": {
    "enabled": true,
    "port": 9000
  }
}
```

### Example 3: Explicit Provider (OpenRouter)

**sf.config.json:**
```json
{
  "agi": {
    "enabled": true,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  }
}
```

**Set API Key:**
```bash
export OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Example 4: Anthropic Direct

**sf.config.json:**
```json
{
  "agi": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

**Set API Key:**
```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Troubleshooting

### "AGI server is enabled but no API key found"

This only happens if you specified a `provider` in your config. Either:

1. **Remove the provider field** to use AGI's defaults (recommended)
2. **Set the API key** for the provider you specified

### "AGI server health check failed"

Try:
1. Check if port 3456 is available: `lsof -i :3456`
2. Run with debug: `bun run apps/cli/index.ts --debug`
3. Check if `@agi-cli/server` is installed: `bun pm ls | grep agi`

## Best Practices

1. ✅ **Start minimal** - Just set `enabled: true`
2. ✅ **Use environment variables** for API keys
3. ✅ **Only specify provider/model** if you have a specific requirement
4. ✅ **Don't commit API keys** to version control
5. ✅ **Use `--network`** only on trusted networks

## Summary

The simplest AGI setup is now just:

```json
{
  "agi": { "enabled": true }
}
```

Run it, and AGI will work with its built-in defaults. No API keys needed (unless you override the provider), no complex configuration required!
