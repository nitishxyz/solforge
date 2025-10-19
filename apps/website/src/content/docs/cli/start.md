---
title: solforge start
description: Start the SolForge development environment
---

# solforge start

Start the complete SolForge development environment including RPC server, WebSocket server, Web GUI, and AI assistant.

## Usage

```bash
solforge start [options]
```

## What It Does

The `start` command launches all configured SolForge services:

1. **RPC Server** - JSON-RPC HTTP server on port 8899 (default)
2. **WebSocket Server** - Real-time subscriptions on port 8900 (default)
3. **Web Dashboard** - React-based GUI on port 42069 (default, if enabled)
4. **AGI Server** - AI assistant on port 3456 (default, if enabled)
5. **Bootstrap Tasks** - Auto-airdrops and cloning as configured

## Options

### `--network`

Bind servers to `0.0.0.0` instead of `127.0.0.1` for LAN access.

```bash
solforge --network
```

This allows other devices on your network to connect to:
- RPC: `http://YOUR_IP:8899`
- GUI: `http://YOUR_IP:42069`

### `--ci, -y`

Non-interactive mode. Uses existing configuration without prompts.

```bash
solforge --ci
solforge start -y
```

Perfect for CI/CD pipelines and automated testing.

### `--debug`

Enable debug logging for troubleshooting.

```bash
solforge --debug
```

## Startup Sequence

### 1. Configuration Check

Looks for `sf.config.json` in the current directory:

- **Found**: Uses existing configuration (prompts to reuse or recreate unless `--ci` is used)
- **Not Found**: Runs interactive setup wizard (creates config unless `--ci` is used)

### 2. Server Initialization

Starts servers based on configuration:

```
Starting RPC on 127.0.0.1:8899 (WS 8900, GUI 42069)...
RPC started
```

### 3. Health Check

Waits for RPC server to be ready (up to 10 seconds).

### 4. Bootstrap Environment

Runs configured bootstrap tasks:

```json
{
  "clone": {
    "programs": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    "tokens": ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
  },
  "bootstrap": {
    "airdrops": [
      { "address": "YourWallet...", "amountSol": 100 }
    ]
  }
}
```

### 5. AI Server (Optional)

If AGI is enabled in config:

```
🤖 AGI Server started on port 3456
   Provider: openrouter
   Model: anthropic/claude-3.5-sonnet
   Agent: general
   Web UI: http://127.0.0.1:3456/ui
```

### 6. Ready

```
Solforge ready ➜ HTTP http://127.0.0.1:8899 | WS ws://127.0.0.1:8900 | GUI http://127.0.0.1:42069 | AGI http://127.0.0.1:3456/ui
```

## Examples

### Basic Start

```bash
solforge start
```

### LAN Access

Allow connections from other devices on your network:

```bash
solforge --network
```

Then connect from another device:
```javascript
const connection = new Connection("http://192.168.1.100:8899");
```

### CI/CD Pipeline

```bash
solforge init  # Create default config
solforge --ci
```

Or in GitHub Actions:

```yaml
- name: Start SolForge
  run: |
    solforge init
    solforge --ci &
    sleep 2  # Wait for startup
    
- name: Run Tests
  run: anchor test --skip-local-validator
```

### Custom Ports

Edit `sf.config.json` before starting:

```json
{
  "server": {
    "rpcPort": 9999,
    "wsPort": 10000
  },
  "gui": {
    "port": 3000
  }
}
```

```bash
solforge start
```

### Minimal Setup (No GUI, No AI)

```json
{
  "gui": {
    "enabled": false
  },
  "agi": {
    "enabled": false
  }
}
```

```bash
solforge start
```

### With Bootstrap

```json
{
  "clone": {
    "programs": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    "tokens": ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]
  },
  "bootstrap": {
    "airdrops": [
      { "address": "YourDevWallet...", "amountSol": 100 }
    ]
  }
}
```

```bash
solforge start
```

Programs and tokens are cloned, wallet is funded automatically.

## Configuration

The `start` command uses `sf.config.json`. See [Configuration Reference](/config/reference) for all options.

Key configuration sections:

- `server`: RPC/WebSocket ports and database mode
- `svm`: Faucet configuration
- `gui`: Web dashboard settings
- `agi`: AI assistant settings
- `clone`: Programs/tokens to clone on startup
- `bootstrap`: Automatic airdrops

## Environment Variables

Override configuration with environment variables:

```bash
# Override host
RPC_HOST=0.0.0.0 solforge

# Custom ports
SOLFORGE_GUI_PORT=3000 SOLFORGE_AGI_PORT=4000 solforge start

# Debug mode
DEBUG_RPC_LOG=1 solforge
```

## Stopping

Press `Ctrl+C` to stop all servers gracefully.

```bash
^C
# All servers will shut down
```

Or use a separate terminal:

```bash
# In terminal 1
solforge start

# In terminal 2
pkill -f solforge
```

## Troubleshooting

### Port Already in Use

**Error**: `Address already in use`

**Solution**: Change ports in `sf.config.json` or kill the process using the port:

```bash
lsof -i :8899
kill <PID>
```

### RPC Not Starting

**Error**: `RPC server did not become ready in time`

**Solution**:
1. Check for port conflicts
2. Try different ports
3. Enable debug logging: `solforge --debug`

### GUI Not Loading

**Issue**: GUI shows "Cannot connect to server"

**Solution**:
1. Verify RPC is running: `curl http://127.0.0.1:8899/health`
2. Check GUI port is correct
3. Clear browser cache

### AGI Not Starting

**Issue**: AGI server doesn't start or no API key error

**Solution**:
1. Set API key: `export OPENROUTER_API_KEY="sk-or-v1-..."`
2. Or disable AGI in config: `"agi": { "enabled": false }`
3. Check logs for specific error

### Bootstrap Fails

**Issue**: Token/program cloning fails

**Solution**:
1. Check internet connection
2. Verify `clone.endpoint` is accessible
3. Check program/token IDs are correct
4. Try manual clone: `solforge token clone <MINT>`

## Advanced Usage

### Run in Background

```bash
# Using nohup
nohup solforge --ci > solforge.log 2>&1 &

# Using screen
screen -S solforge
solforge start
# Press Ctrl+A, then D to detach

# Using tmux
tmux new -s solforge
solforge start
# Press Ctrl+B, then D to detach
```

### Multiple Instances

Run multiple SolForge instances on different ports:

```bash
# Instance 1
cd project1
# Edit sf.config.json: ports 8899, 8900, 42069
solforge start

# Instance 2
cd project2
# Edit sf.config.json: ports 9999, 10000, 43069
solforge start
```

### Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY sf.config.json .

RUN bun install -g solforge

EXPOSE 8899 8900 42069

CMD ["solforge", "start", "--ci", "--network"]
```

```bash
docker build -t solforge .
docker run -p 8899:8899 -p 8900:8900 -p 42069:42069 solforge
```

## Related Commands

- solforge - Initialize configuration
- [solforge rpc start](/cli/overview#solforge-rpc-start) - Start only RPC server
- [solforge status](/cli/overview#solforge-status) - Check server status
- [solforge stop](/cli/overview#solforge-stop) - Stop servers

## Next Steps

- [First Project](/getting-started/first-project) - Build your first app
- [Configuration](/config/reference) - Customize your setup
- [Web Dashboard](/core/web-dashboard) - Learn about the GUI
- [AI Assistant](/ai/quickstart) - Enable AI coding help
