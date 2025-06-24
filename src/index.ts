#!/usr/bin/env bun

// Suppress bigint-buffer warning
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = function(chunk: any, encoding?: any, callback?: any) {
  if (typeof chunk === 'string' && chunk.includes('bigint: Failed to load bindings')) {
    return true; // Suppress this specific warning
  }
  return originalStderrWrite(chunk, encoding, callback);
};

import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "fs";
import { resolve } from "path";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { startCommand } from "./commands/start.js";
import { mintCommand } from "./commands/mint.js";
import { listCommand } from "./commands/list.js";
import { stopCommand, killCommand } from "./commands/stop.js";
import { addProgramCommand } from "./commands/add-program.js";
import packageJson from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("solforge")
  .description("Solana localnet orchestration tool")
  .version(packageJson.version);

// Check for sf.config.json in current directory
function findConfig(): string | null {
  const configPath = resolve(process.cwd(), "sf.config.json");
  return existsSync(configPath) ? configPath : null;
}

program
  .command("init")
  .description("Initialize a new sf.config.json in current directory")
  .action(async () => {
    console.log(chalk.blue("🚀 Initializing SolForge configuration..."));
    await initCommand();
  });

program
  .command("start")
  .description("Start localnet with current sf.config.json")
  .option("--debug", "Enable debug logging to see commands and detailed output")
  .action(async (options) => {
    const configPath = findConfig();
    if (!configPath) {
      console.error(
        chalk.red("❌ No sf.config.json found in current directory")
      );
      console.log(chalk.yellow("💡 Run `solforge init` to create one"));
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
  .command("add-program")
  .description("Add a program to sf.config.json")

  .option("--program-id <address>", "Mainnet program ID to clone and deploy")
  .option("--name <name>", "Friendly name for the program")
  .option("--no-interactive", "Run in non-interactive mode")
  .action(async (options) => {
    await addProgramCommand(options);
  });

program
  .command("status")
  .description("Show localnet status")
  .action(async () => {
    await statusCommand();
  });

program.addCommand(mintCommand);

program
  .command("reset")
  .description("Reset localnet ledger")
  .action(async () => {
    console.log(chalk.blue("🔄 Resetting localnet..."));
    // TODO: Implement reset
  });

program.parse();
