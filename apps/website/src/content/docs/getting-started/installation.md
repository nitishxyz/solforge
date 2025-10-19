---
title: Installation
description: Complete installation guide for SolForge across different platforms
---

# Installation

Complete installation guide for SolForge across different platforms and package managers.

## Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- **Solana CLI** (optional, recommended for airdrops)
- **Operating System**: macOS, Linux, or Windows (WSL2)

## Installation Methods

### 1. One-Liner Install (Recommended)

The fastest way to get started:

```bash
curl -fsSL https://install.solforge.sh | sh
```

This script:
- Detects your platform (macOS/Linux/Windows)
- Downloads the correct binary
- Installs to `/usr/local/bin` or `~/.local/bin`
- Makes it available globally as `solforge`

### 2. Package Manager Install

#### Bun (Recommended for Performance)

```bash
bun install -g solforge
```

#### npm

```bash
npm install -g solforge
```

#### pnpm

```bash
pnpm add -g solforge
```

#### Yarn

```bash
yarn global add solforge
```

### 3. Manual Binary Install

Download the latest release for your platform:

**macOS (Apple Silicon)**
```bash
curl -L https://github.com/nitishxyz/solforge/releases/latest/download/solforge-darwin-arm64 -o solforge
chmod +x solforge
sudo mv solforge /usr/local/bin/
```

**macOS (Intel)**
```bash
curl -L https://github.com/nitishxyz/solforge/releases/latest/download/solforge-darwin-x64 -o solforge
chmod +x solforge
sudo mv solforge /usr/local/bin/
```

**Linux (x64)**
```bash
curl -L https://github.com/nitishxyz/solforge/releases/latest/download/solforge-linux-x64 -o solforge
chmod +x solforge
sudo mv solforge /usr/local/bin/
```

**Linux (ARM64)**
```bash
curl -L https://github.com/nitishxyz/solforge/releases/latest/download/solforge-linux-arm64 -o solforge
chmod +x solforge
sudo mv solforge /usr/local/bin/
```

**Windows (x64)**
```powershell
# Download from GitHub releases
# https://github.com/nitishxyz/solforge/releases/latest/download/solforge-windows-x64.exe
# Add to PATH
```

### 4. Build from Source

For development or custom builds:

```bash
# Clone the repository
git clone https://github.com/nitishxyz/solforge.git
cd solforge

# Install dependencies (use Bun!)
bun install

# Run from source
bun apps/cli/index.ts start

# Or build a binary
bun run --filter @solforge/cli build:bin

# Binary will be in ./bin/
```

## Installing Solana CLI (Optional)

SolForge works standalone, but the Solana CLI is useful for airdrops and wallet management:

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

See [Solana's official docs](https://docs.solana.com/cli/install-solana-cli-tools) for more details.

## Verify Installation

```bash
solforge --version
```

You should see something like:
```
0.2.18
```

Test that it works:
```bash
solforge help
```

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4 GB+ |
| Disk Space | 500 MB | 2 GB+ |
| CPU | 2 cores | 4 cores+ |
| Network | Stable internet | High-speed |

## Platform-Specific Notes

### macOS

On macOS, you may need to allow the binary in System Preferences:
1. Try to run `solforge`
2. Go to System Preferences → Security & Privacy
3. Click "Allow Anyway" next to the SolForge message

Alternatively, remove the quarantine flag:
```bash
sudo xattr -r -d com.apple.quarantine /usr/local/bin/solforge
```

### Linux

If installing to `~/.local/bin`, ensure it's in your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Windows (WSL2)

SolForge works best on Windows using WSL2:

1. Install WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
2. Install Ubuntu from Microsoft Store
3. Follow Linux installation steps inside WSL2

## Updating SolForge

### Package Manager Installs
```bash
bun update -g solforge
# or
npm update -g solforge
```

### Binary Installs
Re-run the installation command to download the latest version.

### Check for Updates
```bash
solforge --version
# Compare with latest release on GitHub
```

## Uninstalling

### Package Manager
```bash
bun remove -g solforge
# or
npm uninstall -g solforge
```

### Binary
```bash
sudo rm /usr/local/bin/solforge
# or
rm ~/.local/bin/solforge
```

### Clean Up Data
```bash
# Remove SolForge data directory
rm -rf ~/.solforge

# Remove project-specific configs
rm sf.config.json
rm -rf .solforge/
```

## Troubleshooting Installation

### Command Not Found

**Issue**: `solforge: command not found`

**Solution**:
1. Check installation location: `which solforge`
2. Ensure it's in your PATH
3. Try restarting your terminal
4. For npm/bun installs, check global bin directory:
   ```bash
   npm config get prefix  # Should be in PATH
   ```

### Permission Denied

**Issue**: `Permission denied` when running solforge

**Solution**:
```bash
chmod +x /usr/local/bin/solforge
```

### Binary Won't Run on macOS

**Issue**: "solforge cannot be opened because the developer cannot be verified"

**Solution**:
```bash
sudo xattr -r -d com.apple.quarantine /usr/local/bin/solforge
```

Or go to System Preferences → Security & Privacy → Allow

### Version Mismatch

**Issue**: Old version after update

**Solution**:
```bash
# Clear npm/bun cache
npm cache clean --force
bun pm cache rm

# Reinstall
npm uninstall -g solforge
npm install -g solforge
```

## Next Steps

Now that SolForge is installed:

1. [Quick Start Guide](/getting-started/quickstart) - Get running in 30 seconds
2. [First Project](/getting-started/first-project) - Create your first Solana project
3. [Configuration](/config/reference) - Customize your setup

## Getting Help

- Check [Troubleshooting Guide](/advanced/troubleshooting)
- Search [GitHub Issues](https://github.com/nitishxyz/solforge/issues)
- Report installation problems on GitHub
