# SolForge – Fast, Friendly Solana Localnet

SolForge is a drop‑in, sub‑second Solana localnet powered by LiteSVM. It starts fast, works with the standard Solana toolchain, and includes a tiny GUI for everyday tasks.

Highlights
- Sub‑second startup and low memory usage
- Works with Solana CLI, Anchor, web3.js, and @solana/kit
- Unlimited faucet airdrops, simple persistence, WS subscriptions
- 90+ JSON‑RPC methods implemented (common dev flows covered)
- Built‑in GUI: airdrops, SPL mints, quick status

Install
- One‑liner: curl -fsSL https://install.solforge.sh | sh
- Manual: download a release binary from GitHub and put it on PATH

Quick Start
- Start localnet: `solforge start`
- RPC: `http://127.0.0.1:8899`, WS: `ws://127.0.0.1:8900`
- GUI: `http://127.0.0.1:42069`

CLI Basics
- Help: `solforge --help`
- Version: `solforge --version`

Commands
- `start` / `rpc start`: Start RPC (and WS, GUI)
- `config init|get|set`: Manage `sf.config.json`
- `airdrop --to <pubkey> --sol <amount>`: Faucet airdrop
- `mint`: Interactive SPL minting helper
- `token clone|create|adopt-authority`: SPL token tools
- `program clone|load|accounts clone`: Program + account helpers

Solana CLI
- Point to SolForge: `solana config set -u http://127.0.0.1:8899`
- Airdrop freely: `solana airdrop 1000`
- Deploy as usual: `solana program deploy ./program.so`

Anchor
- `anchor.toml` provider.cluster = `"http://127.0.0.1:8899"`
- `anchor test --skip-local-validator`

@solana/kit
```
const rpc = createSolanaRpc("http://127.0.0.1:8899");
await rpc.getBalance(pubkey).send();
await rpc.requestAirdrop(pubkey, lamports(1_000_000_000n)).send();
```

Configuration
- File: `sf.config.json` (generate with `solforge config init`)
- Server: ports, DB mode (ephemeral/persistent), DB path
- SVM: initial lamports, faucet SOL
- Clone: mainnet endpoint, programs/tokens/accounts to import
- GUI: enable and port

Environment Variables
- `RPC_PORT`: HTTP port (default 8899); WS is port+1
- `DEBUG_RPC_LOG=1`: Log all RPC calls
- `SOLFORGE_DB_MODE=ephemeral|persistent`
- `SOLFORGE_DB_PATH=.solforge/db.db`
- `SOLFORGE_GUI_PORT`: GUI port (default 42069)

GUI
- Runs with the RPC by default at `http://127.0.0.1:42069`
- Shows status (slot, block height, txs, blockhash, faucet)
- Quick forms: airdrop SOL, mint SPL tokens

From Source
- Requires Bun
- `bun install`
- `bun src/cli/main.ts start`
- `bun run build:bin` builds standalone binaries

Repo Map
- CLI entry (Node shim): `cli.cjs`:1
- CLI router: `src/cli/main.ts`:1
- RPC bootstrap: `src/rpc/start.ts`:1
- Config schema: `src/config/index.ts`:1
- JSON‑RPC methods (server): `server/methods/index.ts`:1

Uninstall
- Remove the `solforge` binary from your PATH (eg. `~/.local/bin` or `/usr/local/bin`).

Troubleshooting
- Port in use: set `RPC_PORT` or change `server.rpcPort` in `sf.config.json`
- GUI not loading: set `SOLFORGE_GUI_PORT` or disable via config
- Slow startup: delete `.solforge/db.db` (if using persistent mode)

License
- MIT — see `LICENSE` for details.
