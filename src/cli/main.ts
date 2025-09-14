// Minimal, fast CLI router with @clack/prompts for UX
import * as p from "@clack/prompts";
import { rpcStartCommand } from "./commands/rpc-start";
import { configCommand } from "./commands/config";
import { airdropCommand } from "./commands/airdrop";
import { mintCommand } from "./commands/mint";

const argv = Bun.argv.slice(2);

async function main() {
  const [cmd, sub, ...rest] = argv;

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }

  // Alias: solforge start -> solforge rpc start
  if (cmd === "start") {
    await rpcStartCommand(rest);
    return;
  }

  switch (cmd) {
    case "rpc": {
      if (sub === "start") return rpcStartCommand(rest);
      return unknownCommand([cmd, sub]);
    }
    case "config": {
      return configCommand(sub, rest);
    }
    case "airdrop": {
      return airdropCommand(rest);
    }
    case "mint": {
      return mintCommand(rest);
    }
    default:
      return unknownCommand([cmd, sub]);
  }
}

function printHelp() {
  console.log(`
solforge <command>

Commands:
  rpc start           Start RPC & WS servers
  start               Alias for 'rpc start'
  config init         Create sf.config.json in CWD
  config get <key>    Read a config value (dot path)
  config set <k> <v>  Set a config value
  airdrop --to <pubkey> --sol <amount>  Airdrop SOL via RPC faucet
  mint ...            Mint cloned token accounts (scaffold)
`);
}

async function unknownCommand(parts: (string | undefined)[]) {
  p.log.error(`Unknown command: ${parts.filter(Boolean).join(" ")}`);
  printHelp();
}

main();

