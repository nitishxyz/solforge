---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

Common issues and how to solve them.

## Installation Issues

### Command Not Found

**Issue**: `solforge: command not found`

**Solution**:
```bash
# Check installation
which solforge

# Reinstall
bun install -g solforge

# Check PATH
echo $PATH
```

### Permission Denied

**Issue**: `Permission denied` when running

**Solution**:
```bash
chmod +x /usr/local/bin/solforge
```

## Startup Issues

### Port Already in Use

**Error**: `Address already in use (os error 48)`

**Solution**:
```bash
# Find process using port
lsof -i :8899

# Kill it
kill <PID>

# Or use different port in config
{
  "server": { "rpcPort": 9999 }
}
```

### RPC Server Not Starting

**Error**: `RPC server did not become ready in time`

**Solution**:
1. Check for port conflicts
2. Enable debug: `solforge --debug`
3. Try different ports
4. Check firewall settings

## Configuration Issues

### Invalid JSON

**Error**: `Invalid JSON in configuration file`

**Solution**:
```bash
# Validate JSON
bun run -c 'JSON.parse(await Bun.file("sf.config.json").text())'

# Recreate config
mv sf.config.json sf.config.json.backup
solforge
```

### Config Not Loading

**Issue**: Changes to config not taking effect

**Solution**:
1. Restart SolForge
2. Verify file location (must be in CWD)
3. Check JSON syntax

## AI Assistant Issues

### AGI Not Starting

**Issue**: AGI server doesn't start

**Solution**:
```bash
# Check API key
echo $OPENROUTER_API_KEY

# Set it
export OPENROUTER_API_KEY="sk-or-v1-..."

# Or disable AGI
{
  "agi": { "enabled": false }
}
```

### Model Not Available

**Error**: Model not found or access denied

**Solution**:
1. Check model name matches provider format
2. Verify API key has access to model
3. Try different model

## Program/Token Cloning

### Clone Fails

**Error**: `Failed to clone program/token`

**Solution**:
1. Check internet connection
2. Verify endpoint is accessible:
   ```bash
   curl https://api.mainnet-beta.solana.com -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```
3. Try different endpoint
4. Check program/token ID is correct

### Timeout

**Issue**: Clone operation times out

**Solution**:
1. Use faster RPC endpoint (Helius, QuickNode)
2. Reduce accounts limit: `--accounts-limit 50`
3. Clone without accounts first

## Testing Issues

### Anchor Tests Fail

**Issue**: Tests timeout or fail

**Solution**:
```bash
# Ensure SolForge is running
solforge

# Run tests with skip flag
anchor test --skip-local-validator

# Increase timeout in tests
describe("test", { timeout: 60000 }, () => {
  // ...
});
```

### Transaction Fails

**Issue**: Transaction simulation fails

**Solution**:
1. Check account balances (airdrop more SOL)
2. Verify program is deployed
3. Check transaction logs in GUI
4. Enable RPC debug: `DEBUG_RPC_LOG=1 solforge`

## GUI Issues

### Dashboard Won't Load

**Issue**: GUI shows "Cannot connect to server"

**Solution**:
1. Verify RPC is running:
   ```bash
   curl http://127.0.0.1:8899/health
   ```
2. Check GUI port matches config
3. Clear browser cache
4. Try different browser

### Real-time Updates Not Working

**Issue**: GUI doesn't update in real-time

**Solution**:
1. Check WebSocket connection
2. Verify wsPort in config
3. Check browser console for errors

## Performance Issues

### High Memory Usage

**Issue**: SolForge using too much memory

**Solution**:
1. Use ephemeral mode
2. Disable unused services (GUI, AGI)
3. Restart periodically in long sessions

### Slow Startup

**Issue**: Takes longer than expected to start

**Solution**:
1. Reduce bootstrap tasks
2. Use ephemeral mode
3. Check disk I/O (if persistent mode)

## Getting Help

### Enable Debug Logging

```bash
DEBUG_RPC_LOG=1 solforge --debug
```

### Check Logs

GUI shows recent RPC logs. Web Dashboard has transaction details.

### Report Issues

[GitHub Issues](https://github.com/nitishxyz/solforge/issues)

Include:
- SolForge version (`solforge --version`)
- Operating system
- Error message
- Config (remove sensitive data)
- Steps to reproduce

## Still Stuck?

See [Development Guide](/advanced/development) or ask on GitHub Discussions.
