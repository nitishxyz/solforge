---
title: AI Providers
description: Configure AI providers for SolForge assistant
---

# AI Provider Configuration

SolForge supports multiple AI providers for its integrated assistant.

## Supported Providers

- **OpenRouter** (Recommended) - Access to all models with one API key
- **Anthropic** - Direct Claude access
- **OpenAI** - Direct GPT access

## OpenRouter (Recommended)

### Why OpenRouter?

- Access to Claude, GPT-4, and 100+ other models
- Single API key for all providers
- Pay-as-you-go pricing
- No vendor lock-in

### Setup

1. Get API key from [openrouter.ai](https://openrouter.ai)

2. Configure in `sf.config.json`:

```json
{
  "agi": {
    "enabled": true,
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  }
}
```

3. Set environment variable:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### Recommended Models

```json
{
  "agi": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"  // Best overall
  }
}
```

Other options:
- `"openai/gpt-4-turbo"` - Fast, good for quick queries
- `"anthropic/claude-3-opus"` - Most capable, slower
- `"openai/gpt-4o"` - Latest GPT-4 model

## Anthropic

### Setup

1. Get API key from [console.anthropic.com](https://console.anthropic.com)

2. Configure:

```json
{
  "agi": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4.5-20250514"
  }
}
```

3. Set API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Models

- `claude-sonnet-4.5-20250514` - Latest, recommended
- `claude-3-5-sonnet-20241022` - Previous version
- `claude-3-opus-20240229` - Most capable

## OpenAI

### Setup

1. Get API key from [platform.openai.com](https://platform.openai.com)

2. Configure:

```json
{
  "agi": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4-turbo"
  }
}
```

3. Set API key:

```bash
export OPENAI_API_KEY="sk-..."
```

### Models

- `gpt-4-turbo` - Fast, good quality
- `gpt-4o` - Latest model
- `gpt-4` - Standard GPT-4

## Agent Types

SolForge has specialized agents for different tasks:

```json
{
  "agi": {
    "agent": "general"  // or "build"
  }
}
```

- `general`: General Solana development & debugging
- `build`: Build processes & deployment tasks

## Minimal Config (No API Key)

For basic usage without requiring an API key initially:

```json
{
  "agi": {
    "enabled": true
  }
}
```

SolForge will use smart defaults.

## Troubleshooting

### API Key Not Found

Ensure environment variable is set:

```bash
echo $OPENROUTER_API_KEY
# Should show: sk-or-v1-...
```

### Model Not Available

Check provider's documentation for available models. Model names vary by provider:

- OpenRouter: `"provider/model"` format
- Anthropic: Model ID directly
- OpenAI: Model ID directly

### AGI Server Not Starting

Check logs for specific errors:

```bash
solforge --debug
```

## Cost Optimization

### Use Cheaper Models for Simple Tasks

```json
{
  "agi": {
    "provider": "openrouter",
    "model": "openai/gpt-4-turbo"  // Faster, cheaper than Claude
  }
}
```

### Monitor Usage

Check provider dashboards:
- OpenRouter: Usage dashboard
- Anthropic: Console usage
- OpenAI: Platform usage

## Related

- [AI Quickstart](/ai/quickstart)
- [Configuration Reference](/config/reference)
