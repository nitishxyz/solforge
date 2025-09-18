#!/usr/bin/env bun

// Suppress bigint-buffer warning
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
	if (
		typeof chunk === "string" &&
		chunk.includes("bigint: Failed to load bindings")
	) {
		return true; // Suppress this specific warning
	}
	return originalStderrWrite(chunk, encoding, callback);
};

import chalk from "chalk";
import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import packageJson from "../package.json" with { type: "json" };
import { addProgramCommand } from "./commands/add-program.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { mintCommand } from "./commands/mint.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { killCommand, stopCommand } from "./commands/stop.js";

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
	.option(
		"--network",
		"Make API server accessible over network (binds to 0.0.0.0 instead of 127.0.0.1)",
	)
	.action(async (options) => {
		const configPath = findConfig();
		if (!configPath) {
			console.error(
				chalk.red("❌ No sf.config.json found in current directory"),
			);
			console.log(chalk.yellow("💡 Run `solforge init` to create one"));
			process.exit(1);
		}

		await startCommand(options.debug || false, options.network || false);
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
	.command("api-server")
	.description("Start API server standalone")
	.option("-p, --port <port>", "Port for API server", "3000")
	.option(
		"--host <host>",
		"Host to bind to (default: 127.0.0.1, use 0.0.0.0 for network access)",
	)
	.option("--rpc-url <url>", "Validator RPC URL", "http://127.0.0.1:8899")
	.option("--faucet-url <url>", "Validator faucet URL", "http://127.0.0.1:9900")
	.option("--work-dir <dir>", "Work directory", "./.solforge")
	.action(async (options) => {
		const configPath = findConfig();
		if (!configPath) {
			console.error(
				chalk.red("❌ No sf.config.json found in current directory"),
			);
			console.log(chalk.yellow("💡 Run `solforge init` to create one"));
			process.exit(1);
		}

		// Import API server components
		const { APIServer } = await import("./services/api-server.js");
		const { configManager } = await import("./config/manager.js");

		try {
			await configManager.load(configPath);
			const config = configManager.getConfig();

			const apiServer = new APIServer({
				port: parseInt(options.port),
				host: options.host,
				validatorRpcUrl: options.rpcUrl,
				validatorFaucetUrl: options.faucetUrl,
				config,
				workDir: options.workDir,
			});

			const result = await apiServer.start();
			if (result.success) {
				console.log(chalk.green("✅ API Server started successfully!"));

				// Keep the process alive
				process.on("SIGTERM", async () => {
					console.log(
						chalk.yellow("📡 API Server received SIGTERM, shutting down..."),
					);
					await apiServer.stop();
					process.exit(0);
				});

				process.on("SIGINT", async () => {
					console.log(
						chalk.yellow("📡 API Server received SIGINT, shutting down..."),
					);
					await apiServer.stop();
					process.exit(0);
				});

				// Keep process alive
				setInterval(() => {}, 1000);
			} else {
				console.error(
					chalk.red(`❌ Failed to start API server: ${result.error}`),
				);
				process.exit(1);
			}
		} catch (error) {
			console.error(
				chalk.red(
					`❌ API Server error: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
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
