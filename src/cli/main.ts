// Minimal, fast CLI router with @clack/prompts for UX
import * as p from "@clack/prompts";
// Load version for --version in both bun script and compiled binary
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import pkg from "../../package.json" assert { type: "json" };

// Robust arg parsing for both bun script and compiled binary
const known = new Set([
  "help",
  "-h",
  "--help",
  "version",
  "-v",
  "--version",
  "rpc",
  "start",
  "config",
  "airdrop",
  "mint",
  "token",
  "program",
]);
const raw = Bun.argv.slice(1);
const firstIdx = raw.findIndex((a) => known.has(String(a)));
const argv = firstIdx >= 0 ? raw.slice(firstIdx) : [];

async function main() {
	const [cmd, sub, ...rest] = argv;

  if (!cmd) {
    const { runSolforge } = await import("./run-solforge");
    // Pass through any flags provided when no explicit command was given
    await runSolforge(raw);
    return;
  }

  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }

  if (cmd === "version" || cmd === "-v" || cmd === "--version") {
    printVersion();
    return;
  }

	// Alias: solforge start -> solforge rpc start
	if (cmd === "start") {
		// Run the full Solforge flow (config ensure + bootstrap + servers)
		const { runSolforge } = await import("./run-solforge");
		await runSolforge(rest);
		return;
	}

	switch (cmd) {
		case "rpc": {
			if (sub === "start") {
				const { rpcStartCommand } = await import("./commands/rpc-start");
				return rpcStartCommand(rest);
			}
			return unknownCommand([cmd, sub]);
		}
		case "config": {
			const { configCommand } = await import("./commands/config");
			return configCommand(sub, rest);
		}
		case "airdrop": {
			const { airdropCommand } = await import("./commands/airdrop");
			return airdropCommand(rest);
		}
		case "mint": {
			const { mintCommand } = await import("./commands/mint");
			return mintCommand(rest);
		}
		case "token": {
			if (sub === "clone") {
				const { tokenCloneCommand } = await import("./commands/token-clone");
				return tokenCloneCommand(rest);
			}
			if (sub === "create") {
				const { tokenCreateCommand } = await import("./commands/token-create");
				return tokenCreateCommand(rest);
			}
			if (sub === "adopt-authority") {
				const { tokenAdoptAuthorityCommand } = await import(
					"./commands/token-adopt-authority"
				);
				return tokenAdoptAuthorityCommand(rest);
			}
			return unknownCommand([cmd, sub]);
		}
		case "program": {
			if (sub === "clone") {
				const { programCloneCommand } = await import(
					"./commands/program-clone"
				);
				return programCloneCommand(rest);
			}
			if (sub === "load") {
				const { programLoadCommand } = await import("./commands/program-load");
				return programLoadCommand(rest);
			}
			if (sub === "accounts") {
				const [_, __, ...tail] = argv.slice(2); // re-read to check deep subcommand
				if (tail[0] === "clone") {
					const { programAccountsCloneCommand } = await import(
						"./commands/program-clone"
					);
					return programAccountsCloneCommand(tail.slice(1));
				}
			}
			return unknownCommand([cmd, sub]);
		}
		default:
			return unknownCommand([cmd, sub]);
	}
}

function printHelp() {
  console.log(`
solforge <command>

Commands:
  (no command)        Run setup then start RPC & WS servers
  rpc start           Start RPC & WS servers
  start               Alias for 'rpc start'
  config init         Create sf.config.json in CWD
  config get <key>    Read a config value (dot path)
  config set <k> <v>  Set a config value
  airdrop --to <pubkey> --sol <amount>  Airdrop SOL via RPC faucet
  mint                 Interactive: pick mint, receiver, amount
  token clone <mint>  Clone SPL token mint + accounts
  program clone <programId>              Clone program code (and optionally accounts)
  program accounts clone <programId>     Clone accounts owned by program

Options:
  -h, --help          Show help
  -v, --version       Show version
  --network           Bind servers to 0.0.0.0 (LAN access)
  -y, --ci            Non-interactive; auto-accept prompts (use existing config)
`);
}

async function unknownCommand(parts: (string | undefined)[]) {
  p.log.error(`Unknown command: ${parts.filter(Boolean).join(" ")}`);
  printHelp();
}

function printVersion() {
	// Prefer package.json version if available
	const v = (pkg as any)?.version ?? "";
	console.log(String(v));
}

main();
