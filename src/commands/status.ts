import chalk from "chalk";
import { configManager } from "../config/manager.js";
import { processRegistry } from "../services/process-registry.js";
import { checkSolanaTools, runCommand } from "../utils/shell.js";

export async function statusCommand(): Promise<void> {
	console.log(chalk.blue("📊 Checking system status...\n"));

	// Check Solana CLI tools
	console.log(chalk.cyan("🔧 Solana CLI Tools:"));
	const tools = await checkSolanaTools();

	console.log(
		`  ${tools.solana ? "✅" : "❌"} solana CLI: ${
			tools.solana ? "Available" : "Not found"
		}`,
	);
	console.log(
		`  ${tools.splToken ? "✅" : "❌"} spl-token CLI: ${
			tools.splToken ? "Available" : "Not found"
		}`,
	);

	if (!tools.solana || !tools.splToken) {
		console.log(chalk.yellow("\n💡 Install Solana CLI tools:"));
		console.log(
			chalk.gray(
				'   sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"',
			),
		);
		console.log();
	}

	// Check running validators
	console.log(chalk.cyan("\n🏗️  Validator Status:"));

	// Clean up dead processes first
	await processRegistry.cleanup();

	const validators = processRegistry.getRunning();

	if (validators.length === 0) {
		console.log(`  ❌ No validators running`);
		console.log(`  💡 Run 'solforge start' to launch a validator`);
	} else {
		console.log(
			`  ✅ ${validators.length} validator${
				validators.length > 1 ? "s" : ""
			} running`,
		);

		for (const validator of validators) {
			const isRunning = await processRegistry.isProcessRunning(validator.pid);
			if (isRunning) {
				console.log(`  🔹 ${validator.name} (${validator.id}):`);
				console.log(`     🌐 RPC: ${validator.rpcUrl}`);
				console.log(`     💰 Faucet: ${validator.faucetUrl}`);
				console.log(`     🆔 PID: ${validator.pid}`);

				// Get current slot for this validator
				try {
					const slotResult = await runCommand(
						"solana",
						["slot", "--url", validator.rpcUrl, "--output", "json"],
						{ silent: true, jsonOutput: true },
					);

					if (slotResult.success && typeof slotResult.stdout === "object") {
						console.log(`     📊 Current slot: ${slotResult.stdout}`);
					}
				} catch {
					// Ignore slot check errors
				}
			} else {
				processRegistry.updateStatus(validator.id, "stopped");
				console.log(
					`  ⚠️  ${validator.name} (${validator.id}): Process stopped`,
				);
			}
		}

		console.log(`  💡 Run 'solforge list' for detailed validator information`);
	}

	// Check config file
	console.log(chalk.cyan("\n📄 Configuration:"));
	try {
		const config = configManager.getConfig();
		console.log(`  ✅ Config loaded: ${configManager.getConfigPath()}`);
		console.log(`  📝 Project: ${config.name}`);
		console.log(`  🪙 Tokens: ${config.tokens.length}`);
		console.log(`  📦 Programs: ${config.programs.length}`);
	} catch (error) {
		console.log(`  ❌ No valid configuration found`);
		console.log(`  💡 Run 'solforge init' to create one`);
	}

	console.log();
}
