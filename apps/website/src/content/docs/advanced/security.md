---
title: Security
description: Security best practices for SolForge
---

# Security Best Practices

SolForge is a **development tool** for local testing. Follow these guidelines:

## ⚠️ Never Use in Production

- SolForge is for **local development only**
- Unlimited airdrops, no real value
- Simplified security model

## API Keys

### Never Commit to Git

```bash
# Add to .gitignore
sf.config.json
.env
```
solforge  # Binds to 127.0.0.1 by default
For LAN access, use `--network`:
solforge --network  # Binds to 0.0.0.0

### Use Environment Variables

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

Not in config:

```json
{
  "agi": {
    "apiKey": "sk-..."  // ❌ Don't do this
  }
}
```

## Network Access

### Local Development

```bash
solforge  # Binds to 127.0.0.1
```

### LAN Access (Use with Caution)

```bash
solforge --network  # Binds to 0.0.0.0
```

Only use `--network` on trusted networks.

## Program Security

### Test Programs Thoroughly

Even on localnet, test for:
- Integer overflow
- PDA derivation issues
- Authority checks
- Account validation

### Don't Deploy Untested Code

Test on SolForge first, then devnet, then mainnet.

## Data Persistence

### Ephemeral Mode (Default)

```json
{
  "server": {
    "db": { "mode": "ephemeral" }
  }
}
```

Data lost on restart. Safest for development.

### Persistent Mode

```json
{
  "server": {
    "db": {
      "mode": "persistent",
      "path": ".solforge/db.db"
    }
  }
}
```

Add to `.gitignore`:
```
.solforge/
```

## Best Practices

1. **Use separate wallets** for development
2. **Never use mainnet keys** in localnet
3. **Rotate API keys** regularly
4. **Keep SolForge updated** for security patches
5. **Use `--ci` in automation** (non-interactive)

## Reporting Security Issues

Found a security issue? Email: security@solforge.dev

## Related

- [Configuration](/config/reference)
- [Development](/advanced/development)
