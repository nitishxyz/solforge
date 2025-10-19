---
title: CI/CD Integration
description: Using SolForge in CI/CD pipelines
---

# CI/CD Integration

SolForge is perfect for CI/CD with fast startup and minimal resource usage.

## GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install SolForge
        run: bun install -g solforge
      
      - name: Start SolForge
        run: |
          solforge
          solforge --ci &
          sleep 2
      
      - name: Install Dependencies
        run: bun install
      
      - name: Run Tests
        run: anchor test --skip-local-validator
          solforge --ci &
          sleep 5
```
    - solforge --ci &
    - sleep 5

## GitLab CI

```yaml
test:
  image: oven/bun:latest
  script:
    - bun install -g solforge
    - solforge
    - solforge --ci &
    - sleep 2
    - bun install
    - anchor test --skip-local-validator
```

## Benefits

- **Fast**: < 1s startup doesn't bottleneck builds
- **Lightweight**: ~50MB RAM usage
- **Reliable**: Deterministic for testing
- **No rate limits**: Unlimited airdrops

See [Configuration](/config/reference) for CI-specific configs.
