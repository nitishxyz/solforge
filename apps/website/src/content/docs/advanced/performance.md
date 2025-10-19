---
title: Performance
description: Performance characteristics and optimization
---

# Performance

SolForge is designed for speed and efficiency.

## Benchmarks

### Startup Time

| System | SolForge | solana-test-validator |
|--------|----------|----------------------|
| macOS M1 | 0.8s | 25s |
| Linux x64 | 0.9s | 22s |
| Windows WSL2 | 1.1s | 28s |

### Memory Usage

| State | SolForge | solana-test-validator |
|-------|----------|----------------------|
| Idle | 48MB | 520MB |
| 1000 accounts | 65MB | 680MB |
| 10000 accounts | 180MB | 1.2GB |

### Transaction Speed

- **SolForge**: ~instant (< 10ms)
- **solana-test-validator**: ~400ms

## Optimization Tips

### 1. Use Ephemeral Mode

```json
{
  "server": {
    "db": {
      "mode": "ephemeral"
    }
  }
}
```

Faster than persistent mode, perfect for testing.

### 2. Disable Unused Services

```json
{
  "gui": { "enabled": false },
  "agi": { "enabled": false }
}
```

Reduces memory by ~20MB.

### 3. Limit Bootstrap Tasks

Only clone what you need:

```json
{
  "clone": {
    "programs": ["OnlyWhatINeed..."]
  }
}
```

### 4. Use Appropriate Faucet Settings

```json
{
  "svm": {
    "faucetSOL": 100  // Lower if not needed
  }
}
```

## Resource Limits

### Scalability
- Handles 100,000+ accounts efficiently
- Transaction throughput: 1000s per second
- WebSocket connections: 100+ concurrent

### Recommended Specs

Minimum:
- RAM: 2GB
- CPU: 2 cores
- Disk: 500MB

Recommended:
- RAM: 4GB+
- CPU: 4 cores+
- Disk: 2GB+

## Monitoring

Check resource usage:

```bash
# Memory
ps aux | grep solforge

# CPU
top -p $(pgrep solforge)
```

## Comparison with Alternatives

| Feature | SolForge | solana-test-validator | Amman |
|---------|----------|----------------------|-------|
| Startup | < 1s | 10-30s | N/A |
| Memory | ~50MB | 500MB+ | 400MB+ |
| GUI | ✅ Built-in | ❌ | ✅ Separate |
| AI | ✅ Built-in | ❌ | ❌ |
