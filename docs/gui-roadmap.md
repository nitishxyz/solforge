# SolForge GUI & Endpoint Plan

## Guiding Principles
- Ship a single Bun executable that boots both RPC and GUI servers; shared runtime, separate ports (RPC defaults to 8899, GUI to 42069).
- Keep RPC wide open (same surface as CLI); the GUI talks exclusively to JSON-RPC endpoints.
- Prefer clarity over cleverness: modular files (<200 LOC) and simple data plumbing per SolForge guidelines.
- Tailwind-first dark UI: clean, minimal styling with excellent readability.
- Defer WebSockets; begin with fetch/poll flows and iterate later.

## Deployment Model
- The executable starts the RPC server on the configured port (default 8899) and, in parallel, starts the GUI server on `guiPort` (default 42069, configurable via setup and `sf.config.json`).
- Initial setup wizard must surface GUI port alongside RPC/WS ports so users can change it up front.
- GUI assets are bundled into the executable via Bun HTML import; no external build steps at runtime.
- Cross-origin is local-only, but to simplify fetches expose a small `/api/*` facade on the GUI server that internally forwards JSON-RPC calls to the RPC port (still RPC-backed, keeps browser code clean).

## Data Strategy (RPC-Only)
- **Initial Page Load**: GUI fetches programs and tokens immediately after mount; repeat on manual refreshes or via light polling.
- **Programs**: call `getProgramAccounts`/`getParsedProgramAccounts` with executable filtering to list deployed programs; provide an "Add" call-to-action that links into CLI/docs for cloning.
- **Tokens/Mints**:
  - Enumerate known mints with `solforgeListMints` (always available; no admin gating in this phase).
  - Fetch mint metadata via `getParsedAccountInfo` + SPL decoding for supply/decimals/authority.
  - Fetch token accounts per mint/owner with `getTokenAccountsByOwner` or parsed variant when needed.
- **RPC Stats**: gather slot, block height, transaction count, latest blockhash, faucet lamports via core RPC calls.
- **Airdrop & Mint**: use `requestAirdrop` for SOL, `solforgeMintTo` for SPL tokens; confirmation via `getSignatureStatuses`. Mint UI remains enabled even if `SOLFORGE_ADMIN` is unset (we will revisit restrictions later).

## Backend Tasks
1. **Server Wiring**
   - Extend startup (e.g., `startRpcServers`) to spin up the existing RPC server plus a new GUI `Bun.serve` instance listening on `guiPort` (default 42069).
   - Ensure routes include `/` (HTML import), static assets, and `/api/*` JSON forwarders that call the RPC server internally (using the same process).
2. **Configuration**
   - Update config schema, setup wizard, and CLI parsing to persist/read `guiPort` (default 42069) alongside RPC/WS settings.
   - Document port relationships and how to access both servers.
3. **Executable Embedding**
   - Follow `docs/bun-single-file-executable.md`: compile the GUI via HTML import, run Tailwind build prior to `bun build --compile`, ensure assets are in Bun's module graph.

## Frontend Tasks
1. **Tailwind Setup**
   - Add Tailwind configuration (dark mode via `class`) and source entry (e.g., `src/gui/src/index.css` with base/utilities/components).
   - Build CSS to `src/gui/public/tailwind.css`; import from `index.html`.
2. **App Shell**
   - Layout with dark background, comfortable spacing, responsive columns.
   - Place Airdrop/Mint form at top; below it show RPC detail cards; follow with Programs and Tokens sections, each with "Add" actions.
3. **Airdrop/Mint Form**
   - Provide select listing `SOL` plus `solforgeListMints` results; capture amount input.
   - Trigger RPC calls (through `/api/*` or direct JSON-RPC) and display signatures + confirmation status.
4. **Data Displays**
   - **RPC Details**: slot, block height, tx count, latest blockhash, faucet balance; auto-refresh every ~5s.
   - **Programs**: cards/table showing program id, owner, executable flag, data length; include refresh control.
   - **Tokens**: similar presentation with supply, decimals, mint authority, quick view of holder count.
5. **Hooks & API**
   - Implement `src/gui/src/api.ts` with typed helpers for all RPC calls.
   - Add reusable polling hook to refresh data while keeping components thin (<100 LOC).

## Build & Packaging
- Tailwind build step (e.g., `bunx tailwindcss -i src/gui/src/index.css -o src/gui/public/tailwind.css --minify`) runs before compiling the executable.
- Compile the CLI+servers into a single binary: `bun build --compile apps/cli/index.ts --outfile dist/solforge` (plus `--target` variants as needed).
- Document the build pipeline and configuration flags in README.

## Testing & Validation
- Unit tests for server proxy functions (if `/api/*` implemented).
- bun/react tests for Airdrop/Mint form logic and API wrappers (mock RPC responses).
- Manual pass: start binary, verify RPC on configured port, GUI on configured GUI port (default 42069), confirm initial data loads, perform SOL airdrop and SPL mint, observe Tailwind dark theme.

## Open Questions / Follow-Ups
- Confirm whether hot reload/dev mode is desired for GUI during development (might require separate Bun serve workflow).
- Define behaviour of "Add program/token" buttons (link to CLI instructions vs. future modals).
- Revisit WebSocket streaming for real-time updates once base experience lands.

## Phased Milestones
- MVP (Foundations)
  - Binary boots RPC (8899) and GUI (42069).
  - Static GUI served with Tailwind dark theme.
  - Airdrop SOL and Mint SPL via JSON-RPC proxy; show signature + status.
  - Programs and Tokens lists load via RPC calls; manual refresh works.
  - Config supports `guiPort`; README section for access instructions.
- Beta (Quality & DX)
  - Polling hooks with backoff and pause-on-visibility-hidden.
  - Error toasts, loading states, empty states across sections.
  - Minimal e2e smoke via `bun:test` + mocked RPC.
  - Basic stats card auto-refresh; faucet balance warning threshold.
- v1.0 (Polish & Extensibility)
  - Persist lightweight UI prefs (e.g., last-selected mint) in `localStorage`.
  - Optional WS streaming behind flag (no regressions if disabled).
  - Pluggable card registry for future views (accounts, logs, etc.).

## `/api` Facade Spec
- POST `/api/jsonrpc`
  - Body: JSON-RPC 2.0 request object (single), forwarded to local RPC port.
  - Response: raw JSON-RPC 2.0 response from RPC server.
  - Rationale: keep browser code small; batching can arrive later.
- GET `/api/stats`
  - Aggregates: `getSlot`, `getBlockHeight`, `getLatestBlockhash`, `getTransactionCount` and faucet balance if available.
  - Response: `{ slot, blockHeight, transactionCount, latestBlockhash, faucetLamports }`.
  - Implementation: executes a few internal JSON-RPC calls and composes result.

## Frontend Layout (kebab-case)
```
src/gui/
├── index.html                 # Bun HTML import target
├── public/
│   └── tailwind.css           # built CSS (minified)
└── src/
    ├── index.tsx              # app bootstrap
    ├── api.ts                 # typed RPC helpers via /api/jsonrpc
    ├── hooks/
    │   ├── use-polling.ts     # interval/backoff + visibility handling
    │   └── use-rpc.ts         # generic JSON-RPC caller
    ├── components/
    │   ├── app-shell.tsx
    │   ├── airdrop-mint-form.tsx
    │   ├── rpc-stats-card.tsx
    │   ├── programs-list.tsx
    │   └── tokens-list.tsx
    └── types.ts               # minimal UI-facing types (no any)
```

## Config Additions
- Extend `sf.config.json` with:
  - `guiPort: number` (default 42069)
- Type shape (TS):
```ts
export interface SolforgeConfig {
  rpcPort: number;
  wsPort?: number;
  guiPort: number; // new
  // ...existing fields
}
```
- Setup wizard: prompt for GUI port alongside RPC/WS.

## Server Wiring Sketch (Bun)
```ts
// pseudo-code outline
const gui = Bun.serve({
  port: config.guiPort ?? 42069,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/api/jsonrpc") {
      // forward body to local RPC server without network hop
      const body = await req.text();
      const resp = await rpcServer.handleJson(body); // call into in-process handler
      return new Response(resp, { headers: { "content-type": "application/json" } });
    }
    if (req.method === "GET" && url.pathname === "/api/stats") {
      const [slot, blockHeight, txCount, bh, faucet] = await Promise.all([
        rpc.call("getSlot"),
        rpc.call("getBlockHeight"),
        rpc.call("getTransactionCount"),
        rpc.call("getLatestBlockhash"),
        rpc.call("getBalance", [faucetPubkey]).catch(() => 0n),
      ]);
      return Response.json({ slot, blockHeight, transactionCount: txCount, latestBlockhash: bh.blockhash, faucetLamports: faucet });
    }
    // static index + assets
    if (url.pathname === "/") return new Response(Bun.file("src/gui/index.html"));
    if (url.pathname === "/tailwind.css") return new Response(Bun.file("src/gui/public/tailwind.css"));
    return new Response("Not found", { status: 404 });
  },
});
```

## API Helpers (browser)
- `api.jsonrpc<T>(method: string, params: unknown[]): Promise<T>`
- `api.getStats(): Promise<{ slot: number; blockHeight: number; transactionCount: number; latestBlockhash: string; faucetLamports: bigint }>`
- Prefer `bigint` for lamports; stringify via custom JSON replacer only at the display boundary.

## Tailwind Build
- Build once before compile: `bunx tailwindcss -i src/gui/src/index.css -o src/gui/public/tailwind.css --minify`.
- Ensure the CSS output path is included in the module graph or accessed via `Bun.file()`.

## Testing Plan (bun:test)
- API facade
  - Forwards JSON-RPC body unchanged; returns response as-is.
  - `/api/stats` composes values and handles RPC failure gracefully.
- Hooks
  - `use-polling` respects visibility, clears timers on unmount, backs-off on errors.
- Components
  - Airdrop/Mint: disables submit during in-flight; shows signature; polls `getSignatureStatuses` until "confirmed".
  - Lists: render empty states and error banners.

## Acceptance Criteria (MVP)
- Binary launches; visiting `http://localhost:42069/` shows GUI without extra build steps.
- Clicking "Airdrop SOL" on a valid address yields a signature and a confirmed status.
- Selecting a mint and submitting "Mint Tokens" yields a signature and confirmation.
- Programs and Tokens sections render data or a clear empty state.
- Stats card refreshes automatically and never blocks the UI.

## Risks & Constraints
- Embedding assets: keep the GUI asset set small to avoid bloating the single-file binary.
- BigInt in JSON: do not leak `bigint` directly through JSON; cast to string only in UI.
- Cross-origin: prefer same-origin via GUI `/api/*` to avoid CORS complexity.

## Work Checklist
- [ ] Add `guiPort` to config + setup wizard
- [ ] Implement GUI `Bun.serve` with `/api/jsonrpc`, `/api/stats`, and static routes
- [ ] Add Tailwind pipeline and base dark theme
- [ ] Scaffold frontend layout and components
- [ ] Implement `api.ts` with JSON-RPC helper
- [ ] Wire Airdrop/Mint form to RPC
- [ ] Implement polling hooks and stats card
- [ ] Write unit tests for facade, hooks, and form logic
- [ ] Update README with GUI usage and ports
