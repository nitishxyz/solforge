// Minimal, fast CLI router with @clack/prompts for UX
import * as p from "@clack/prompts";

const argv = Bun.argv.slice(2);

async function main() {
  const [cmd, sub, ...rest] = argv;

  if (!cmd) {
    const { runSolforge } = await import("./run-solforge");
    await runSolforge();
    return;
  }

  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }

  // Alias: solforge start -> solforge rpc start
  if (cmd === "start") {
    const { rpcStartCommand } = await import("./commands/rpc-start");
    await rpcStartCommand(rest);
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
        const { tokenAdoptAuthorityCommand } = await import("./commands/token-adopt-authority");
        return tokenAdoptAuthorityCommand(rest);
      }
      return unknownCommand([cmd, sub]);
    }
    case "program": {
      if (sub === "clone") {
        const { programCloneCommand } = await import("./commands/program-clone");
        return programCloneCommand(rest);
      }
      if (sub === "load") {
        const { programLoadCommand } = await import("./commands/program-load");
        return programLoadCommand(rest);
      }
      if (sub === "accounts") {
        const [_, __, ...tail] = argv.slice(2); // re-read to check deep subcommand
        if (tail[0] === "clone") {
          const { programAccountsCloneCommand } = await import("./commands/program-clone");
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
`);
}

async function unknownCommand(parts: (string | undefined)[]) {
  p.log.error(`Unknown command: ${parts.filter(Boolean).join(" ")}`);
  printHelp();
}

main();
