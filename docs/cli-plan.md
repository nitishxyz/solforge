# SolForge CLI & GUI Plan

## Goals
- Ship a single `solforge` CLI with subcommands to manage a local LiteSVM.
- Provide an optional GUI dashboard (React in Bun) via `solforge gui`.
- Support a project-local `sf.config.json` for reproducible environments.
- Add cloning utilities to import programs, program accounts, and tokens from mainnet.

## Command Surface (Phase 1)

- `solforge rpc start [options]` (alias: `solforge start`)
  - Starts JSON-RPC server and WS server.
  - Options: `--port <num>` (HTTP), `--ws-port <num>`, `--db-mode <ephemeral|persistent>`, `--db-path <path>`, `--faucet <SOL>`, `--config <path>`.
  - Reads defaults from `sf.config.json` in CWD when present.

- `solforge gui [options]`
  - Starts the RPC server and serves a React dashboard via Bun `routes` on the same process.
  - Options: same as `start`, plus `--ui-port <num>` if served separately (fallback if port sharing is problematic).

- `solforge config init [--force]`
  - Writes a new `sf.config.json` into CWD with sensible defaults.

- `solforge config get <key>`
  - Prints value from config (supports dot-path: e.g. `svm.initialLamports`).

- `solforge config set <key> <value>`
  - Updates config keys (creates nested keys as needed).

- `solforge token clone <mintAddress> [options]`
  - Clones SPL Token mint and (optionally) selected token accounts from mainnet to LiteSVM.
  - Options: `--endpoint <url>`, `--all-accounts`, `--holders <N>`, `--program <tokenProgramId>`.

- `solforge program clone <programId> [options]`
  - Clones an executable program account’s data from mainnet to LiteSVM.
  - Options: `--endpoint <url>`, `--with-accounts`, `--accounts-limit <N>`, `--filters <json>`.

- `solforge program accounts clone <programId> [options]`
  - Clones accounts owned by a program from mainnet to LiteSVM (no code).
  - Options: `--endpoint <url>`, `--limit <N>`, `--filters <json>`.

## Configuration: `sf.config.json`

```json
{
  "$schema": "./docs/sf-config.schema.json",
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": { "mode": "ephemeral", "path": ".solforge/db.db" }
  },
  "svm": {
    "initialLamports": "1000000000000000",
    "faucetSOL": 1000
  },
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com",
    "programs": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    "tokens": ["So11111111111111111111111111111111111111112"],
    "programAccounts": [
      { "programId": "Tokenkeg...", "limit": 1000, "filters": [] }
    ]
  },
  "gui": {
    "enabled": false,
    "uiPath": "ui/public/index.html",
    "port": null
  }
}
```

Notes:
- Values like `initialLamports` use string BigInt to avoid JSON precision loss.
- `clone.endpoint` can be overridden per-command with `--endpoint`.

## Architecture & Files

- `src/cli/`
  - `main.ts` — CLI entry: parses `Bun.argv`, dispatches subcommands.
  - `commands/start.ts` — start server from config/flags.
  - `commands/gui.ts` — start server with UI routes.
  - `commands/config.ts` — init/get/set helpers.
  - `commands/token-clone.ts` — clone mint + accounts.
  - `commands/program-clone.ts` — clone program code.
  - `commands/program-accounts-clone.ts` — clone owned accounts.
  - `utils/prompts.ts` — wrapper around `@clack/prompts` for consistent UX.

- `src/config/`
  - `index.ts` — read/merge/validate config, dot-path get/set, write.
  - `types.ts` — shared config types.

- `src/rpc/` (facade over current `server/` initially)
  - `start.ts` — wraps existing RPC/WS start with options: ports, db, gui routes.
  - Reuse `server/rpc-server.ts` and `server/ws-server.ts` (minimal changes). Later we can move code into `src/rpc/`.

- `ui/`
  - `public/index.html` — HTML entry (dashboard shell).
  - `src/app.tsx`, `src/main.tsx`, `src/styles.css` — React app.

## Server Integration for GUI

- Use `Bun.serve({ routes: { "/": indexHtml, ... }, fetch })` so GET `"/"` serves UI while POST continues to handle JSON-RPC.
- When `gui` is enabled, inject `routes` and optionally set `development: true` when `NODE_ENV !== 'production'`.
- Fallback: serve UI on separate port if needed via `--ui-port`.

## Cloning Strategy (Phase 1)

- Dependencies: use `@solana/web3.js` or `@solana/kit` for reads only (no new deps).
- Token clone
  - Fetch mint account data; create in LiteSVM with same address/data/owner.
  - Optionally fetch top-N token accounts by balance and recreate.
- Program clone
  - Fetch program account; write executable account with original data.
  - Optional: clone owned program accounts (same flow as program-accounts clone).
- Program accounts clone
  - Use `getProgramAccounts` with filters/limit; recreate in LiteSVM.

## Build & Packaging

- Compile `src/cli/main.ts` to single binary: `bun build src/cli/main.ts --compile --outfile dist/solforge`.
- Drizzle migrations: use the existing `drizzle/` folder. No duplicate embedded SQL.
  - Packaging options:
    - A) Distribute binary alongside the `drizzle/` folder (simple; zero duplication).
    - B) If strict single-file is required, reference the existing SQL files via static imports so Bun bundles them (no duplication), and add a tiny read adapter that feeds them to the migrator. We will only do this if you choose strict single-file.

## Testing (Phase 1)

- `bun:test` unit tests for:
  - CLI parsing and dispatch.
  - Config read/write and dot-path set/get.
  - Start command: start on random port, `/health` responds.
- Light e2e for cloning commands behind a flag (skipped in CI by default).

## Phases & Milestones

1) CLI Scaffold
   - CLI entry + help, `rpc start`, `config init|get|set`.
2) GUI Integration
   - React scaffold, route via server, `solforge gui` command.
3) Cloning Utilities
   - `token clone`, `program clone`, `program accounts clone`.
4) Polish & Packaging
   - Build targets, README docs, usage examples.

## Acceptance Criteria (Phase 1)

- `solforge rpc start` (and alias `solforge start`) launches RPC + WS, reading `sf.config.json`.
- `solforge gui` serves React dashboard and RPC on same process.
- `solforge config init|get|set` operates on CWD `sf.config.json`.
- Binaries produced for macOS/Linux/Windows via `bun build --compile`.

## CLI Libraries

- Prompts: `@clack/prompts` from the start for interactive flows (init, confirm, selects).
- Router: minimal zero-dependency command router over `Bun.argv` for speed and clarity.
