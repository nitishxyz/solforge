# Solforge Monorepo Architecture

Visual diagrams and architecture documentation for the Solforge monorepo refactor.

---

## Package Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SOLFORGE MONOREPO                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                         apps/                                │  │
│  │                                                              │  │
│  │  ┌─────────────────────┐      ┌──────────────────────────┐  │  │
│  │  │                     │      │                          │  │  │
│  │  │    apps/cli/        │      │      apps/web/           │  │  │
│  │  │                     │      │                          │  │  │
│  │  │  • Main Solforge    │      │  • React + Vite          │  │  │
│  │  │    CLI              │      │  • AGI Design System     │  │  │
│  │  │  • RPC Server       │◄─────┤  • Tailwind CSS          │  │  │
│  │  │  • Web Server       │embeds│  • TypeScript            │  │  │
│  │  │  • Embedded UI      │      │                          │  │  │
│  │  │                     │      │  Outputs: dist/          │  │  │
│  │  │  Binary: solforge   │      │  (index.html, assets/)   │  │  │
│  │  │                     │      │                          │  │  │
│  │  └─────────────────────┘      └──────────────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      packages/                                │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────┐     │  │
│  │  │                                                      │     │  │
│  │  │         packages/install/                           │     │  │
│  │  │                                                      │     │  │
│  │  │  • Download binary from GitHub releases             │     │  │
│  │  │  • Install to ~/.local/bin/                      │     │  │
│  │  │  • Published to npm as solforge            │     │  │
│  │  │                                                      │     │  │
│  │  │  Usage: bunx solforge                      │     │  │
│  │  │                                                      │     │  │
│  │  └──────────────────────────────────────────────────────┘     │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      scripts/                                 │ │
│  │                                                               │ │
│  │  • build-web.ts   → Builds web UI & generates web-assets.ts  │ │
│  │  • install.sh     → Legacy install (deprecated)              │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Build Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BUILD PROCESS                               │
└─────────────────────────────────────────────────────────────────────┘

1. Developer runs: bun run build (in apps/cli/)
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  prebuild hook runs   │
                        │  scripts/build-web.ts │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Build Web UI         │
                        │  (Vite builds React)  │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  apps/web/dist/       │
                        │  ├── index.html       │
                        │  ├── assets/          │
                        │  │   ├── index-*.js   │
                        │  │   └── index-*.css  │
                        │  └── vite.svg         │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Copy to CLI          │
                        │  apps/cli/src/        │
                        │  web-dist/            │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Read all files       │
                        │  Convert to base64    │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Generate TypeScript  │
                        │  web-assets.ts        │
                        │                       │
                        │  export const assets  │
                        │  = new Map([          │
                        │    ['/index.html',    │
                        │     'base64...'],     │
                        │    ...                │
                        │  ]);                  │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Compile Binary       │
                        │  bun build --compile  │
                        │                       │
                        │  dist/solforge        │
                        │  (50-100 MB)          │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  Binary includes:     │
                        │  • CLI code           │
                        │  • RPC server         │
                        │  • Web server         │
                        │  • Embedded web UI    │
                        │    (base64 encoded)   │
                        └───────────────────────┘
```

---

## Runtime Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RUNTIME EXECUTION                            │
└─────────────────────────────────────────────────────────────────────┘

User runs: ./solforge start
                │
                ↓
    ┌───────────────────────┐
    │  CLI Main Entry       │
    │  apps/cli/index.ts    │
    └───────────────────────┘
                │
                ↓
    ┌───────────────────────────────────────┐
    │  Start RPC Server (port 9100)         │
    │  • Solana JSON-RPC methods            │
    │  • WebSocket subscriptions            │
    │  • REST API endpoints                 │
    └───────────────────────────────────────┘
                │
                ↓
    ┌───────────────────────────────────────┐
    │  Start Web Server (port 9101)         │
    │  src/web-server.ts                    │
    └───────────────────────────────────────┘
                │
                ↓
    ┌───────────────────────────────────────┐
    │  Map URLs to Assets                   │
    │  • / → /index.html                    │
    │  • /assets/index-*.js → JS files      │
    │  • /assets/index-*.css → CSS files    │
    └───────────────────────────────────────┘
                │
                ↓
    ┌───────────────────────────────────────┐
    │  Handle HTTP Request                  │
    └───────────────────────────────────────┘
                │
                ↓
        ┌───────┴───────┐
        │               │
        ↓               ↓
┌───────────────┐  ┌─────────────────────┐
│ Development   │  │ Production          │
│ Mode          │  │ (Compiled Binary)   │
└───────────────┘  └─────────────────────┘
        │                      │
        ↓                      ↓
┌───────────────┐  ┌─────────────────────┐
│ Try read from │  │ getEmbeddedAsset()  │
│ filesystem    │  │ Decode base64       │
│ ./web-dist/   │  │ Return buffer       │
└───────────────┘  └─────────────────────┘
        │                      │
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────┐
        │ If HTML file:        │
        │ Inject script tag:   │
        │ window.SOLFORGE_     │
        │   API_URL = '...'    │
        └──────────────────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │ Return Response      │
        │ with MIME type       │
        └──────────────────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │ Browser receives     │
        │ and renders UI       │
        └──────────────────────┘
```

---

## Web UI Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WEB UI STRUCTURE                             │
└─────────────────────────────────────────────────────────────────────┘

                        ┌───────────────────────┐
                        │    App.tsx            │
                        │    (Main Container)   │
                        └───────────────────────┘
                                    │
                                    ↓
                        ┌───────────────────────┐
                        │  AppLayout            │
                        │  (Header + Sidebar +  │
                        │   Main Content)       │
                        └───────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
        ┌───────────────────┐           ┌──────────────────────┐
        │  Sidebar          │           │  Main Content Area   │
        │  (Navigation)     │           │                      │
        │                   │           │  ┌────────────────┐  │
        │  • Dashboard      │           │  │ Programs Panel │  │
        │  • Programs       │           │  │ • List         │  │
        │  • Tokens         │           │  │ • Clone Modal  │  │
        │  • RPC Status     │           │  │ • Load Modal   │  │
        │  • Config         │           │  └────────────────┘  │
        └───────────────────┘           │                      │
                                        │  ┌────────────────┐  │
                                        │  │ Tokens Panel   │  │
                                        │  │ • List         │  │
                                        │  │ • Clone Modal  │  │
                                        │  │ • Airdrop Form │  │
                                        │  └────────────────┘  │
                                        │                      │
                                        │  ┌────────────────┐  │
                                        │  │ RPC Status     │  │
                                        │  │ • Server info  │  │
                                        │  │ • Controls     │  │
                                        │  └────────────────┘  │
                                        └──────────────────────┘

                    ┌─────────────────────────────────┐
                    │     Component Library (ui/)     │
                    │                                 │
                    │  • Button (variants: primary,   │
                    │    secondary, ghost)            │
                    │  • Input (text, number)         │
                    │  • Card (container)             │
                    │  • Modal (overlay)              │
                    │  • Badge (status indicators)    │
                    └─────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │        API Client (lib/)        │
                    │                                 │
                    │  • config.ts → Get API URL      │
                    │  • api.ts → Fetch methods       │
                    │    - getStatus()                │
                    │    - cloneProgram()             │
                    │    - cloneToken()               │
                    │    - airdrop()                  │
                    └─────────────────────────────────┘
```

---

## Design System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AGI DESIGN SYSTEM                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         COLOR SYSTEM                                │
│                                                                     │
│  Light Mode                          Dark Mode                     │
│  ┌─────────────────────┐             ┌─────────────────────┐       │
│  │ Background: #E8EBF0 │             │ Background: #0F1114 │       │
│  │ (Bluish gray)       │             │ (Very dark)         │       │
│  └─────────────────────┘             └─────────────────────┘       │
│                                                                     │
│  ┌─────────────────────┐             ┌─────────────────────┐       │
│  │ Card: #F7F8FA       │             │ Card: #16181C       │       │
│  │ (Lighter)           │             │ (Slightly lighter)  │       │
│  └─────────────────────┘             └─────────────────────┘       │
│                                                                     │
│  ┌─────────────────────┐             ┌─────────────────────┐       │
│  │ Primary: #121826    │             │ Primary: #F9FAFB    │       │
│  │ (Nearly black)      │             │ (White)             │       │
│  └─────────────────────┘             └─────────────────────┘       │
│                                                                     │
│  ┌─────────────────────┐             ┌─────────────────────┐       │
│  │ Border: #D9DCDF     │             │ Border: #24262B     │       │
│  │ (Subtle)            │             │ (Dark)              │       │
│  └─────────────────────┘             └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        TYPOGRAPHY                                   │
│                                                                     │
│  Font Family: IBM Plex Mono (monospace)                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────┐               │
│  │ h1: 1.875rem (30px) • weight: 700 • Sessions   │               │
│  │ h2: 1.5rem (24px)   • weight: 600 • Sections   │               │
│  │ h3: 1.25rem (20px)  • weight: 600 • Subsections│               │
│  │ Body: 1rem (16px)   • weight: 400 • Content    │               │
│  │ Small: 0.875rem     • weight: 400 • Labels     │               │
│  └─────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        COMPONENT STYLES                             │
│                                                                     │
│  ┌────────────────────────────────────────────────┐                │
│  │ Button Primary                                 │                │
│  │ • bg-primary text-primary-foreground           │                │
│  │ • px-4 py-2 rounded-lg                         │                │
│  │ • hover:bg-primary/90 transition-colors        │                │
│  └────────────────────────────────────────────────┘                │
│                                                                     │
│  ┌────────────────────────────────────────────────┐                │
│  │ Card                                           │                │
│  │ • bg-card border border-border rounded-lg      │                │
│  │ • p-4 or p-6                                   │                │
│  │ • hover:bg-card/80 (interactive)               │                │
│  └────────────────────────────────────────────────┘                │
│                                                                     │
│  ┌────────────────────────────────────────────────┐                │
│  │ Input                                          │                │
│  │ • bg-input border border-border rounded-lg     │                │
│  │ • focus:ring-2 focus:ring-primary              │                │
│  │ • px-3 py-2                                    │                │
│  └────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

User Action (Web UI)
        │
        ↓
┌───────────────────┐
│ React Component   │
│ (e.g., CloneModal)│
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ API Client        │
│ api.cloneProgram()│
└───────────────────┘
        │
        ↓
┌───────────────────────────────┐
│ HTTP POST                     │
│ http://localhost:9100/program/│
│ clone                         │
│ { programId: "..." }          │
└───────────────────────────────┘
        │
        ↓
┌───────────────────┐
│ CLI RPC Server    │
│ Port 9100         │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ Command Handler   │
│ (programClone)    │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ Solana RPC Call   │
│ (getAccountInfo)  │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ litesvm           │
│ (Local Solana VM) │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ Store in DB       │
│ (Drizzle ORM)     │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ Return Response   │
│ { success: true } │
└───────────────────┘
        │
        ↓
┌───────────────────┐
│ Update UI         │
│ (React state)     │
└───────────────────┘
```

---

## Deployment & Distribution

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT STRATEGY                              │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                     GITHUB RELEASES                               │
│                                                                   │
│  1. Build all platform binaries:                                 │
│     • solforge-darwin-arm64                                      │
│     • solforge-darwin-x64                                        │
│     • solforge-linux-x64                                         │
│     • solforge-linux-arm64                                       │
│     • solforge-windows-x64.exe                                   │
│                                                                   │
│  2. Create GitHub Release (v0.3.0)                               │
│                                                                   │
│  3. Upload binaries as release assets                            │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌───────────────────────────────────────────────────────────────────┐
│                        NPM PACKAGE                                │
│                                                                   │
│  1. Build solforge package                              │
│                                                                   │
│  2. Publish to npm:                                              │
│     npm publish packages/install                                 │
│                                                                   │
│  3. Users can install via:                                       │
│     bunx solforge                                       │
│     or                                                           │
│     npx solforge                                        │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌───────────────────────────────────────────────────────────────────┐
│                    INSTALLATION FLOW                              │
│                                                                   │
│  User runs: bunx solforge                               │
│                   │                                              │
│                   ↓                                              │
│  1. Detect platform (darwin-arm64, etc.)                         │
│                   │                                              │
│                   ↓                                              │
│  2. Download binary from GitHub releases                         │
│     https://github.com/nitishxyz/solforge/releases/latest/       │
│     download/solforge-darwin-arm64                               │
│                   │                                              │
│                   ↓                                              │
│  3. Install to ~/.local/bin/solforge                          │
│                   │                                              │
│                   ↓                                              │
│  4. Make executable: chmod +x                                    │
│                   │                                              │
│                   ↓                                              │
│  5. Prompt user to add to PATH:                                  │
│     export PATH="/.local/bin:$PATH"                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  1. LOCALHOST ONLY (Default)                                        │
│     • RPC Server: http://127.0.0.1:9100                            │
│     • Web Server: http://127.0.0.1:9101                            │
│     • Not accessible from network by default                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  2. CORS CONFIGURATION                                              │
│     • Web UI origin whitelisted in RPC server                      │
│     • Only accept requests from localhost:9101                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  3. PATH SANITIZATION                                               │
│     • Prevent directory traversal (../)                            │
│     • Validate asset paths in web server                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  4. CONTENT SECURITY POLICY                                         │
│     • Inject CSP headers in HTML responses                         │
│     • Restrict script sources                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  5. NETWORK FLAG (Optional)                                         │
│     • User can enable: solforge start --network                    │
│     • Binds to 0.0.0.0 for LAN access                             │
│     • Shows warning about security implications                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE STRATEGIES                           │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Build Time Optimizations                                         │
│                                                                   │
│  • Minify web assets (Vite terser)                               │
│  • Remove source maps from production                            │
│  • Tree-shake unused code                                        │
│  • Compress CSS (Tailwind purge)                                 │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Runtime Optimizations                                            │
│                                                                   │
│  • Cache decoded base64 assets in Map                            │
│  • Set long cache headers for static assets (1 year)             │
│  • No cache for HTML (dynamic injection)                         │
│  • Lazy load components in React                                 │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Binary Size Management                                           │
│                                                                   │
│  • Typical size: 50-100 MB                                       │
│  • Could compress with gzip before base64 (optional)             │
│  • Split large assets if needed                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Day-to-Day Development                                           │
│                                                                   │
│  Terminal 1: CLI Development                                      │
│  $ cd apps/cli                                                    │
│  $ bun run dev                                                    │
│  # CLI runs with web server (reads from filesystem)               │
│                                                                   │
│  Terminal 2: Web UI Development                                   │
│  $ cd apps/web                                                    │
│  $ bun run dev                                                    │
│  # Vite dev server with HMR                                       │
│                                                                   │
│  Browser: http://localhost:5173                                   │
│  # Web UI connects to API at localhost:9100                       │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Testing Changes                                                  │
│                                                                   │
│  1. Make changes to web UI                                        │
│  2. Vite auto-reloads                                            │
│  3. Test in browser                                              │
│  4. Build production: bun run build (in apps/cli)                │
│  5. Test binary: ./dist/solforge start                           │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│  Pull Request Workflow                                            │
│                                                                   │
│  1. Create feature branch                                         │
│  2. Make changes                                                  │
│  3. Run: bun run lint                                            │
│  4. Build all: bun run build:all                                 │
│  5. Test manually                                                │
│  6. Create PR                                                    │
│  7. CI/CD runs tests                                             │
│  8. Merge to main                                                │
└───────────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: 2025
**Version**: 1.0
**Status**: Architecture Documentation
