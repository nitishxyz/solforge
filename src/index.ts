#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "fs";
import { resolve } from "path";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { startCommand } from "./commands/start.js";
import { transferCommand } from "./commands/transfer.js";
import { listCommand } from "./commands/list.js";
import { stopCommand, killCommand } from "./commands/stop.js";
import { checkSolanaTools } from "./utils/shell.js";

const program = new Command();

program
  .name("testpilot")
  .description("Solana localnet orchestration tool")
  .version("0.1.0");

// Check for tp.config.json in current directory
function findConfig(): string | null {
  const configPath = resolve(process.cwd(), "tp.config.json");
  return existsSync(configPath) ? configPath : null;
}

program
  .command("init")
  .description("Initialize a new tp.config.json in current directory")
  .action(async () => {
    console.log(chalk.blue("🚀 Initializing testpilot configuration..."));
    await initCommand();
  });

program
  .command("start")
  .description("Start localnet with current tp.config.json")
  .option("--debug", "Enable debug logging to see commands and detailed output")
  .action(async (options) => {
    const configPath = findConfig();
    if (!configPath) {
      console.error(
        chalk.red("❌ No tp.config.json found in current directory")
      );
      console.log(chalk.yellow("💡 Run `testpilot init` to create one"));
      process.exit(1);
    }

    await startCommand(options.debug || false);
  });

program
  .command("list")
  .description("List all running validators")
  .action(async () => {
    await listCommand();
  });

program
  .command("stop")
  .description("Stop running validator(s)")
  .argument("[validator-id]", "ID of validator to stop")
  .option("--all", "Stop all running validators")
  .option("--kill", "Force kill the validator (SIGKILL instead of SIGTERM)")
  .action(async (validatorId, options) => {
    await stopCommand(validatorId, options);
  });

program
  .command("kill")
  .description("Force kill running validator(s)")
  .argument("[validator-id]", "ID of validator to kill")
  .option("--all", "Kill all running validators")
  .action(async (validatorId, options) => {
    await killCommand(validatorId, options);
  });

program
  .command("status")
  .description("Show localnet status")
  .action(async () => {
    await statusCommand();
  });

program.addCommand(transferCommand);

program
  .command("reset")
  .description("Reset localnet ledger")
  .action(async () => {
    console.log(chalk.blue("🔄 Resetting localnet..."));
    // TODO: Implement reset
  });

program.parse();
