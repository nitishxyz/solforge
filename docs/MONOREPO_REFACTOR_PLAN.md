# Solforge Monorepo Refactor Plan

**Date**: 2024
**Status**: Planning
**Goal**: Refactor Solforge into a modern monorepo with separate apps (CLI, Web UI) and packages (installer, shared utilities)

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Detailed Implementation Plan](#detailed-implementation-plan)
6. [New Web UI Implementation](#new-web-ui-implementation)
7. [Build & Deployment](#build--deployment)
8. [Testing Strategy](#testing-strategy)
9. [Timeline & Phases](#timeline--phases)

---

## Overview

### Objectives

1. **Monorepo Structure**: Organize code into logical apps and packages
2. **New Web UI**: Build modern AGI-style web interface with design system
3. **Installer Package**: Separate installation logic into reusable package
4. **Web Embedding**: Embed web UI into CLI binary for single-file distribution
5. **Better DX**: Improve development experience with clear boundaries

### Key Principles

- **Zero Breaking Changes**: Maintain backward compatibility
- **Incremental Migration**: Move code piece by piece
- **Type Safety**: Full TypeScript coverage
- **Documentation**: Keep docs in sync with changes

---

## Current State Analysis

### Current Directory Structure

```
solforge/
├── apps/
│   ├── cli/              # CLI commands, services, RPC bootstrap
│   └── web/              # New web UI (in development)
├── packages/
│   ├── server/           # LiteSVM RPC + WS servers
│   └── install/          # Installer CLI
├── src/gui/              # Legacy GUI assets (being migrated)
├── scripts/              # Build scripts
├── drizzle/              # SQLite migrations
├── package.json          # Root package config
└── index.ts              # Legacy entry point
```

### Current Build Process

```json
{
  "build": "bun run build:bin",
  "build:bin": "bun run build:css && bun run build:gui && bun build --compile apps/cli/index.ts --outfile dist/solforge",
  "build:css": "bunx tailwindcss -i src/gui/src/index.css -o src/gui/public/app.css --minify",
  "build:gui": "bun build src/gui/src/main.tsx --outdir src/gui/public/build --target=browser --minify"
}
```

### Pain Points

1. **Mixed Concerns**: GUI and CLI code intertwined
2. **No Package Boundaries**: Everything in one package
3. **Basic UI**: Current GUI is minimal, needs redesign
4. **Build Complexity**: Manual CSS/GUI build steps
5. **Installation Logic**: Embedded in main CLI, hard to reuse

---

## Target Architecture

### Monorepo Structure

```
solforge/
├── apps/
│   ├── cli/                    # Main Solforge CLI
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands
│   │   │   ├── web-server.ts   # Web UI server
│   │   │   ├── web-assets.ts   # AUTO-GENERATED: Embedded web assets
│   │   │   └── web-dist/       # Built web UI (gitignored)
│   │   ├── index.ts            # CLI entry point
│   │   ├── package.json        # CLI dependencies
│   │   └── tsconfig.json
│   │
│   └── web/                    # New AGI-style Web UI
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── layout/     # Header, Sidebar, Layout
│       │   │   ├── programs/   # Program management UI
│       │   │   ├── tokens/     # Token management UI
│       │   │   ├── rpc/        # RPC status and controls
│       │   │   └── ui/         # Reusable UI primitives
│       │   ├── lib/
│       │   │   ├── config.ts   # API URL configuration
│       │   │   └── api.ts      # API client
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── index.html
│       ├── index.css           # Design system CSS
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── install/                # Installation CLI
│   │   ├── src/
│   │   │   ├── main.ts         # install command
│   │   │   ├── download.ts     # Binary download logic
│   │   │   └── utils.ts
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                 # (Future) Shared utilities
│       ├── src/
│       │   ├── types/          # Shared types
│       │   └── utils/          # Shared utilities
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   ├── build-web.ts            # Web UI build & embedding script
│   └── install.sh              # Legacy install script
│
├── docs/
│   ├── MONOREPO_REFACTOR_PLAN.md
│   ├── AGI_WEB_UI_GUIDE.md
│   └── ...
│
├── package.json                # Root workspace config
├── tsconfig.json               # Root TypeScript config
└── bun.lockb
```

### Package Relationships

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  solforge (packages/install)                       │
│  - Downloads and installs Solforge CLI binary      │
│  - Published to npm                                │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        │ installs
                        ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  solforge CLI (apps/cli)                           │
│  - Main CLI application                            │
│  - Embeds web UI                                   │
│  - Published as binary                             │
│                                                     │
└─────────────────────────────────────────────────────┘
         │                                  │
         │ embeds                          │ uses (future)
         ↓                                  ↓
┌──────────────────────┐      ┌────────────────────────┐
│                      │      │                        │
│  Web UI (apps/web)   │      │  Shared (packages/     │
│  - React app         │      │         shared)        │
│  - AGI design system │      │  - Types               │
│  - Built & embedded  │      │  - Utilities           │
│                      │      │                        │
└──────────────────────┘      └────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Setup Monorepo Structure (Week 1)

**Goal**: Create new directory structure without breaking existing code

**Steps**:
1. Create `apps/` and `packages/` directories
2. Set up root `package.json` with workspace configuration
3. Create base `tsconfig.json` files for each workspace
4. Update `.gitignore` for new structure

**Validation**: Existing code still works, new structure is ready

### Phase 2: Move CLI Code (Week 1-2)

**Goal**: Migrate CLI code to `apps/cli/`

**Steps**:
1. Create `apps/cli/package.json` with dependencies
2. Move `src/cli/*` → `apps/cli/src/cli/`
3. Move `src/commands/*` → `apps/cli/src/commands/`
4. Move `src/config/*` → `apps/cli/src/config/`
5. Move `src/db/*` → `apps/cli/src/db/`
6. Move `src/rpc/*` → `apps/cli/src/rpc/`
7. Move `src/services/*` → `apps/cli/src/services/`
8. Move `src/types/*` → `apps/cli/src/types/`
9. Move `src/utils/*` → `apps/cli/src/utils/`
10. Update imports to use relative paths
11. Create `apps/cli/index.ts` as main entry point

**Validation**: CLI builds and runs successfully

### Phase 3: Build New Web UI (Week 2-3)

**Goal**: Create modern AGI-style web UI

**Steps**:
1. Create `apps/web/` with Vite + React + TypeScript
2. Set up Tailwind with AGI design system configuration
3. Implement design system CSS (colors, typography, components)
4. Build layout components (Header, Sidebar, AppLayout)
5. Build UI primitives (Button, Input, Card, etc.)
6. Implement program management UI
7. Implement token management UI
8. Implement RPC status and controls UI
9. Set up API client with dynamic URL configuration

**Validation**: Web UI builds and runs in development mode

### Phase 4: Web Embedding Setup (Week 3)

**Goal**: Embed web UI into CLI binary

**Steps**:
1. Create `scripts/build-web.ts` (based on AGI pattern)
2. Set up `apps/cli/src/web-server.ts`
3. Generate `apps/cli/src/web-assets.ts` (auto-generated)
4. Update CLI to start web server alongside RPC server
5. Configure prebuild hooks in `apps/cli/package.json`
6. Test development mode (filesystem assets)
7. Test production mode (embedded assets)

**Validation**: CLI binary includes working web UI

### Phase 5: Installer Package (Week 4)

**Goal**: Create separate installer package

**Steps**:
1. Create `packages/install/package.json`
2. Move install logic from `scripts/install.sh` to TypeScript
3. Implement binary download logic
4. Implement installation to system PATH
5. Create `packages/install/index.ts` as CLI entry
6. Publish to npm as `solforge`
7. Update docs with new installation method

**Validation**: `bunx solforge` successfully installs Solforge

### Phase 6: Cleanup & Documentation (Week 4)

**Goal**: Remove legacy code and update documentation

**Steps**:
1. Remove old `src/gui/` directory
2. Consolidate RPC code in `packages/server/` (remove any legacy `server/` dir)
3. Update all documentation
4. Update README with new structure
5. Create migration guide for contributors
6. Update build scripts
7. Test all platforms (darwin-arm64, darwin-x64, linux-x64, etc.)

**Validation**: Clean repo, comprehensive docs, all builds work

---

## Detailed Implementation Plan

### 1. Root Package Configuration

**File**: `package.json`

```json
{
  "name": "solforge-monorepo",
  "version": "0.3.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "bun run build:web && bun run build:cli",
    "build:web": "cd apps/web && bun run build",
    "build:cli": "cd apps/cli && bun run build",
    "build:install": "cd packages/install && bun run build",
    "build:all": "bun run build:web && bun run build:cli && bun run build:install",
    "dev:web": "cd apps/web && bun run dev",
    "dev:cli": "cd apps/cli && bun run dev",
    "lint": "biome check",
    "clean": "rm -rf apps/*/dist apps/*/node_modules packages/*/dist packages/*/node_modules"
  },
  "devDependencies": {
    "@biomejs/biome": "2.2.4",
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

### 2. CLI Package Setup

**File**: `apps/cli/package.json`

```json
{
  "name": "@solforge/cli",
  "version": "0.3.0",
  "private": false,
  "type": "module",
  "bin": {
    "solforge": "./dist/solforge"
  },
  "files": [
    "dist/solforge*"
  ],
  "scripts": {
    "dev": "bun run index.ts",
    "prebuild": "bun run ../../scripts/build-web.ts",
    "build": "bun run prebuild && bun build --compile --minify ./index.ts --outfile dist/solforge",
    "build:darwin-arm64": "bun run prebuild && bun build --compile --minify --target=bun-darwin-arm64 ./index.ts --outfile dist/solforge-darwin-arm64",
    "build:darwin-x64": "bun run prebuild && bun build --compile --minify --target=bun-darwin-x64 ./index.ts --outfile dist/solforge-darwin-x64",
    "build:linux-x64": "bun run prebuild && bun build --compile --minify --target=bun-linux-x64 ./index.ts --outfile dist/solforge-linux-x64",
    "build:linux-arm64": "bun run prebuild && bun build --compile --minify --target=bun-linux-arm64 ./index.ts --outfile dist/solforge-linux-arm64",
    "build:windows-x64": "bun run prebuild && bun build --compile --minify --target=bun-windows-x64 ./index.ts --outfile dist/solforge-windows-x64.exe",
    "build:all": "bun run build:darwin-arm64 && bun run build:darwin-x64 && bun run build:linux-x64 && bun run build:linux-arm64 && bun run build:windows-x64"
  },
  "dependencies": {
    "@clack/prompts": "^0.11.0",
    "@solana-program/compute-budget": "^0.9.0",
    "@solana-program/memo": "^0.8.0",
    "@solana-program/system": "^0.8.0",
    "@solana-program/token": "^0.6.0",
    "@solana/kit": "^3.0.3",
    "@solana/spl-token": "^0.4.14",
    "drizzle-orm": "^0.44.5",
    "litesvm": "^0.3.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "drizzle-kit": "^0.31.4"
  }
}
```

### 3. Web Package Setup

**File**: `apps/web/package.json`

```json
{
  "name": "solforge-web",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "biome check src/"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3",
    "typescript": "^5",
    "vite": "^6.0.3"
  }
}
```

**File**: `apps/web/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
```

### 4. Install Package Setup

**File**: `packages/install/package.json`

```json
{
  "name": "solforge",
  "version": "0.3.0",
  "description": "Install Solforge CLI globally",
  "type": "module",
  "bin": {
    "solforge-install": "./dist/install"
  },
  "files": [
    "dist/install*",
    "README.md"
  ],
  "scripts": {
    "build": "bun build --compile --minify ./index.ts --outfile dist/install",
    "build:all": "bun build --compile --minify --target=bun-darwin-arm64 ./index.ts --outfile dist/install-darwin-arm64 && bun build --compile --minify --target=bun-linux-x64 ./index.ts --outfile dist/install-linux-x64"
  },
  "keywords": [
    "solforge",
    "solana",
    "blockchain",
    "cli",
    "installer"
  ],
  "author": "Solforge Team",
  "license": "MIT",
  "dependencies": {
    "@clack/prompts": "^0.11.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

**File**: `packages/install/index.ts`

```typescript
#!/usr/bin/env bun
import * as p from "@clack/prompts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const GITHUB_REPO = "nitishxyz/solforge";
const VERSION = "latest"; // or fetch from API

async function main() {
  console.clear();
  
  p.intro("🔥 Solforge Installer");
  
  const s = p.spinner();
  
  // Detect platform
  const platform = process.platform;
  const arch = process.arch;
  
  s.start("Detecting platform...");
  await Bun.sleep(500);
  s.stop(`Platform: ${platform}-${arch}`);
  
  // Determine binary name
  const binaryName = getBinaryName(platform, arch);
  if (!binaryName) {
    p.log.error(`Unsupported platform: ${platform}-${arch}`);
    process.exit(1);
  }
  
  // Download binary
  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/${VERSION}/download/${binaryName}`;
  
  s.start(`Downloading ${binaryName}...`);
  
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Install to ~/.local/bin/
    const installDir = join(homedir(), ".local", "bin");
    if (!existsSync(installDir)) {
      mkdirSync(installDir, { recursive: true });
    }
    
    const installPath = join(installDir, "solforge");
    writeFileSync(installPath, Buffer.from(buffer));
    
    // Make executable
    await Bun.$`chmod +x ${installPath}`;
    
    s.stop("✅ Solforge installed successfully!");
    
    // Instructions
    p.note(
      `Add to PATH:\n\nexport PATH="$HOME/.local/bin:$PATH"\n\nThen run: solforge --help`,
      "Next Steps"
    );
    
    p.outro("Happy building! 🚀");
    
  } catch (error) {
    s.stop("❌ Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function getBinaryName(platform: string, arch: string): string | null {
  if (platform === "darwin") {
    if (arch === "arm64") return "solforge-darwin-arm64";
    if (arch === "x64") return "solforge-darwin-x64";
  }
  if (platform === "linux") {
    if (arch === "x64") return "solforge-linux-x64";
    if (arch === "arm64") return "solforge-linux-arm64";
  }
  if (platform === "win32" && arch === "x64") {
    return "solforge-windows-x64.exe";
  }
  return null;
}

main();
```

---

## New Web UI Implementation

### Design System Setup

**File**: `apps/web/index.css`

```css
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme - based on AGI design system */
    --background: 220 25% 95%;
    --foreground: 220 10% 15%;
    --card: 220 25% 98%;
    --card-foreground: 220 10% 15%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 220 18% 88%;
    --secondary-foreground: 222.2 35% 25%;
    --muted: 220 18% 88%;
    --muted-foreground: 220 15% 40%;
    --accent: 220 20% 86%;
    --accent-foreground: 222.2 35% 25%;
    --destructive: 0 90% 65%;
    --destructive-foreground: 210 40% 98%;
    --border: 220 15% 89%;
    --input: 220 15% 89%;
    --ring: 222.2 84% 4.9%;
    --sidebar-background: 220 25% 91%;
    --sidebar-foreground: 220 10% 15%;
    --sidebar-accent: 220 20% 86%;
    --sidebar-border: 220 15% 89%;
    color-scheme: light;
  }

  .dark {
    /* Dark theme - based on AGI design system */
    --background: 240 10% 8%;
    --foreground: 0 0% 98%;
    --card: 240 10% 10%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 75% 45%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --sidebar-background: 240 10% 10%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-border: 240 3.7% 15.9%;
    color-scheme: dark;
  }
}

body {
  margin: 0;
  font-family: "IBM Plex Mono", monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

code {
  font-family: "IBM Plex Mono", monospace;
}
```

**File**: `apps/web/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          border: 'hsl(var(--sidebar-border))',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Mono', 'monospace'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

### Component Structure

```
apps/web/src/components/
├── layout/
│   ├── Header.tsx              # Top navigation bar
│   ├── Sidebar.tsx             # Left sidebar (navigation)
│   └── AppLayout.tsx           # Main layout wrapper
├── programs/
│   ├── ProgramList.tsx         # List of cloned programs
│   ├── ProgramCard.tsx         # Individual program card
│   ├── CloneProgramModal.tsx   # Clone program modal
│   └── LoadProgramModal.tsx    # Load program modal
├── tokens/
│   ├── TokenList.tsx           # List of tokens
│   ├── TokenCard.tsx           # Individual token card
│   ├── CloneTokenModal.tsx     # Clone token modal
│   └── AirdropForm.tsx         # Airdrop/mint form
├── rpc/
│   ├── StatusPanel.tsx         # RPC/WS server status
│   ├── ConfigPanel.tsx         # Configuration display
│   └── ControlButtons.tsx      # Start/stop controls
└── ui/
    ├── Button.tsx              # Reusable button component
    ├── Input.tsx               # Reusable input component
    ├── Card.tsx                # Reusable card component
    ├── Modal.tsx               # Reusable modal component
    └── Badge.tsx               # Reusable badge component
```

### API Client

**File**: `apps/web/src/lib/config.ts`

```typescript
interface SolforgeWindow extends Window {
  SOLFORGE_API_URL?: string;
}

function getApiBaseUrl(): string {
  // Check Vite env var first (for dev mode)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check window object for injected values (for production)
  const win = window as SolforgeWindow;
  if (win.SOLFORGE_API_URL) {
    return win.SOLFORGE_API_URL;
  }
  
  // Fallback for standalone dev
  return 'http://localhost:9100';
}

export const API_BASE_URL = getApiBaseUrl();
```

**File**: `apps/web/src/lib/api.ts`

```typescript
import { API_BASE_URL } from './config';

export interface SolforgeStatus {
  rpcRunning: boolean;
  wsRunning: boolean;
  rpcPort: number;
  wsPort: number;
  programs: Program[];
  tokens: Token[];
}

export interface Program {
  programId: string;
  name?: string;
  clonedAt: string;
}

export interface Token {
  mint: string;
  symbol?: string;
  decimals: number;
  supply: string;
}

class SolforgeAPI {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<SolforgeStatus> {
    const res = await fetch(`${this.baseUrl}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  }

  async cloneProgram(programId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/program/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    });
    if (!res.ok) throw new Error('Failed to clone program');
  }

  async cloneToken(mint: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/token/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mint }),
    });
    if (!res.ok) throw new Error('Failed to clone token');
  }

  async airdrop(to: string, amount: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/airdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, sol: amount }),
    });
    if (!res.ok) throw new Error('Failed to airdrop');
  }
}

export const api = new SolforgeAPI(API_BASE_URL);
```

---

## Build & Deployment

### Build Web Script

**File**: `scripts/build-web.ts`

```typescript
#!/usr/bin/env bun
import { $ } from 'bun';
import { join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const ROOT = import.meta.dir.replace('/scripts', '');
const WEB_DIR = join(ROOT, 'apps/web');
const CLI_DIR = join(ROOT, 'apps/cli');
const WEB_DIST = join(WEB_DIR, 'dist');
const CLI_WEB_DIST = join(CLI_DIR, 'src/web-dist');

console.log('🔨 Building web UI...');
await $`bun run build`.cwd(WEB_DIR);
console.log('✅ Web UI built successfully');

console.log('📦 Copying web UI to CLI...');
await $`rm -rf ${CLI_WEB_DIST}`;
await $`cp -r ${WEB_DIST} ${CLI_WEB_DIST}`;
console.log('✅ Web UI copied to CLI');

// Scan directory recursively
function scanDirectory(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath, baseDir));
    } else {
      const relativePath = fullPath.replace(baseDir + '/', '');
      files.push(relativePath);
    }
  }
  
  return files;
}

console.log('📝 Generating asset manifest...');

const allFiles = scanDirectory(CLI_WEB_DIST);

// Separate files by type
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
const jsFiles = allFiles.filter(f => f.endsWith('.js'));
const cssFiles = allFiles.filter(f => f.endsWith('.css'));
const otherFiles = allFiles.filter(f => 
  !f.endsWith('.html') && 
  !f.endsWith('.js') && 
  !f.endsWith('.css')
);

// Convert to base64
const assetData = new Map<string, string>();

for (const file of allFiles) {
  const filePath = join(CLI_WEB_DIST, file);
  const fileBuffer = await Bun.file(filePath).arrayBuffer();
  const base64 = Buffer.from(fileBuffer).toString('base64');
  assetData.set(`/${file}`, base64);
}

// Generate TypeScript file
const code = `
// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by scripts/build-web.ts

const isCompiledBundle = (() => {
  const url = import.meta.url;
  return typeof url === 'string' && url.includes('/$bunfs/');
})();

const WEB_DIST_PREFIX = isCompiledBundle ? './src/web-dist/' : './web-dist/';

function resolveAsset(path: string) {
  const specifier = WEB_DIST_PREFIX + path;
  try {
    const resolved = import.meta.resolveSync(specifier);
    return resolved;
  } catch {
    return specifier;
  }
}

export const webAssetPaths = {
  html: resolveAsset('${htmlFiles[0]}'),
  js: [${jsFiles.map(f => `resolveAsset('${f}')`).join(', ')}],
  css: [${cssFiles.map(f => `resolveAsset('${f}')`).join(', ')}],
  other: [${otherFiles.map(f => `resolveAsset('${f}')`).join(', ')}],
};

export const assetPaths = {
  html: '/${htmlFiles[0]}',
  assets: {
    js: [${jsFiles.map(f => `'/${f}'`).join(', ')}],
    css: [${cssFiles.map(f => `'/${f}'`).join(', ')}],
    other: [${otherFiles.map(f => `'/${f}'`).join(', ')}]
  }
};

const embeddedAssetBase64 = new Map<string, string>([
  ${Array.from(assetData.entries()).map(([k, v]) => `['${k}', '${v}']`).join(',\n  ')}
]);

const embeddedAssetCache = new Map<string, Uint8Array>();

export function getEmbeddedAsset(path: string): Uint8Array | undefined {
  const cached = embeddedAssetCache.get(path);
  if (cached) return cached;
  
  const base64 = embeddedAssetBase64.get(path);
  if (!base64) return undefined;
  
  const buffer = Buffer.from(base64, 'base64');
  embeddedAssetCache.set(path, buffer);
  return buffer;
}
`;

await Bun.write(join(CLI_DIR, 'src/web-assets.ts'), code);
console.log('✅ Manifest generated');

console.log('🎉 Web UI build complete!');
```

### Web Server

**File**: `apps/cli/src/web-server.ts`

```typescript
import { webAssetPaths, assetPaths, getEmbeddedAsset } from './web-assets';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function createWebServer(port: number, apiPort: number) {
  // Build URL-to-filesystem mapping
  const assetMap = new Map<string, string>();
  
  assetMap.set('/', webAssetPaths.html);
  assetMap.set('/index.html', webAssetPaths.html);
  
  assetPaths.assets.js.forEach((urlPath, index) => {
    assetMap.set(urlPath, webAssetPaths.js[index]);
  });
  
  assetPaths.assets.css.forEach((urlPath, index) => {
    assetMap.set(urlPath, webAssetPaths.css[index]);
  });
  
  assetPaths.assets.other.forEach((urlPath, index) => {
    assetMap.set(urlPath, webAssetPaths.other[index]);
  });
  
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      
      if (assetMap.has(pathname)) {
        const filePath = assetMap.get(pathname)!;
        const file = Bun.file(filePath);
        const fileExists = await file.exists();
        
        // Try filesystem first (development mode)
        if (fileExists) {
          if (pathname.endsWith('.html')) {
            let html = await file.text();
            // Inject API URL dynamically
            const scriptTag = `<script>window.SOLFORGE_API_URL = 'http://localhost:${apiPort}';</script>`;
            html = html.replace('</head>', `${scriptTag}</head>`);
            
            return new Response(html, {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
              },
            });
          }
          
          return new Response(file, {
            headers: {
              'Content-Type': getMimeType(pathname),
              'Cache-Control': 'public, max-age=31536000',
            },
          });
        }
        
        // Fallback to embedded data (production mode)
        const embeddedData = getEmbeddedAsset(pathname);
        if (embeddedData) {
          if (pathname.endsWith('.html')) {
            let html = new TextDecoder().decode(embeddedData);
            const scriptTag = `<script>window.SOLFORGE_API_URL = 'http://localhost:${apiPort}';</script>`;
            html = html.replace('</head>', `${scriptTag}</head>`);
            
            return new Response(html, {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
              },
            });
          }
          
          return new Response(embeddedData, {
            headers: {
              'Content-Type': getMimeType(pathname),
              'Cache-Control': 'public, max-age=31536000',
            },
          });
        }
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });
  
  return { port: server.port, server };
}
```

---

## Testing Strategy

### Unit Tests

- **CLI Commands**: Test each command in isolation
- **API Client**: Test API client methods
- **Components**: Test React components with React Testing Library

### Integration Tests

- **Build Process**: Verify build scripts produce correct output
- **Web Embedding**: Verify assets are correctly embedded and served
- **CLI Integration**: Test CLI commands end-to-end

### Platform Tests

- **Darwin ARM64**: Test on Apple Silicon
- **Darwin x64**: Test on Intel Mac
- **Linux x64**: Test on Linux x86_64
- **Linux ARM64**: Test on Linux ARM64
- **Windows x64**: Test on Windows 64-bit

### Manual Testing Checklist

- [ ] CLI builds successfully on all platforms
- [ ] Web UI builds and embeds correctly
- [ ] All CLI commands work as expected
- [ ] Web UI loads and connects to API
- [ ] Installation via `solforge` works
- [ ] Documentation is accurate and complete

---

## Timeline & Phases

### Week 1: Infrastructure Setup

- ✅ Create monorepo structure
- ✅ Set up workspaces
- ✅ Configure TypeScript
- ✅ Move CLI code to `apps/cli/`
- ✅ Verify builds work

### Week 2: New Web UI Development

- ⏳ Set up Vite + React + TypeScript
- ⏳ Implement design system
- ⏳ Build layout components
- ⏳ Build UI primitives
- ⏳ Implement feature components

### Week 3: Web Embedding & Integration

- ⏳ Create build-web.ts script
- ⏳ Set up web-server.ts
- ⏳ Test development mode
- ⏳ Test production mode (embedded)
- ⏳ Integrate with CLI

### Week 4: Installer & Cleanup

- ⏳ Create `solforge` package
- ⏳ Implement download logic
- ⏳ Test installation flow
- ⏳ Remove legacy code
- ⏳ Update all documentation
- ⏳ Final testing on all platforms

### Week 5: Release & Documentation

- ⏳ Release v0.3.0 with new structure
- ⏳ Publish `solforge` to npm
- ⏳ Update README and guides
- ⏳ Create migration guide
- ⏳ Announce release

---

## Success Criteria

### Must Have

- [x] Monorepo structure with apps/ and packages/
- [ ] CLI builds and runs on all platforms
- [ ] New web UI with AGI design system
- [ ] Web UI embedded in CLI binary
- [ ] Installer package published to npm
- [ ] All existing functionality preserved
- [ ] Documentation updated

### Nice to Have

- [ ] Shared package for common utilities
- [ ] Component library documentation (Storybook)
- [ ] E2E tests with Playwright
- [ ] CI/CD pipeline for automated builds
- [ ] Docker image with new structure

---

## Migration Notes

### Breaking Changes

**None expected** - this refactor maintains full backward compatibility.

### Deprecated Patterns

- ~~Old GUI in `src/gui/`~~ → New web UI in `apps/web/`
- ~~Manual CSS build step~~ → Integrated into web build
- ~~install.sh script~~ → `solforge` package

### New Patterns

- **Workspaces**: Use `bun --filter <package>` for targeted builds
- **Web Embedding**: Assets auto-generated, don't edit `web-assets.ts`
- **API Configuration**: Injected dynamically via `window.SOLFORGE_API_URL`

---

## Next Steps

1. **Verify CLI workspace build** (`bun run build:cli`)
2. **Scaffold Vite app in `apps/web/`** (Phase 3)
3. **Implement `scripts/build-web.ts` + embedding flow** (Phase 4)
4. **Wire GUI server + `/api` facade** (Phase 4)
5. **Add installer package + clean legacy GUI** (Phase 5)

---

## Resources

- **AGI Web UI Guide**: `docs/AGI_WEB_UI_GUIDE.md`
- **Web Embedding Guide**: `docs/webapp-embedding-guide.md`
- **Quick Reference**: `docs/webapp-embedding-quick-ref.md`
- **Bun Workspaces**: https://bun.sh/docs/install/workspaces
- **Vite**: https://vite.dev/
- **React**: https://react.dev/

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Ready for Implementation
