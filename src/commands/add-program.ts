import chalk from "chalk";
import { existsSync } from "node:fs";
import inquirer from "inquirer";
import { configManager } from "../config/manager.js";
import { processRegistry } from "../services/process-registry.js";
import { ProgramCloner } from "../services/program-cloner.js";
import type { ProgramConfig } from "../types/config.js";

export async function addProgramCommand(
	options: { name?: string; programId?: string; interactive?: boolean } = {},
): Promise<void> {
	console.log(chalk.blue("📦 Adding program to configuration...\n"));

	// Check if config exists
	if (!existsSync("./sf.config.json")) {
		console.error(chalk.red("❌ No sf.config.json found in current directory"));
		console.log(chalk.yellow("💡 Run `solforge init` to create one"));
		return;
	}

	// Load current config
	try {
		await configManager.load("./sf.config.json");
	} catch (error) {
		console.error(chalk.red("❌ Failed to load sf.config.json"));
		console.error(
			chalk.red(error instanceof Error ? error.message : String(error)),
		);
		return;
	}

	const config = configManager.getConfig();

	// Get program details
	let programId: string;
	let programName: string | undefined;
	let upgradeable: boolean = false;

	if (options.interactive !== false && !options.programId) {
		// Interactive mode - show common programs + custom option
		const { programChoice } = await inquirer.prompt([
			{
				type: "list",
				name: "programChoice",
				message: "Select a program to add:",
				choices: [
					{
						name: "Token Metadata Program",
						value: {
							id: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
							name: "Token Metadata",
							upgradeable: true,
						},
					},
					{
						name: "Associated Token Account Program",
						value: {
							id: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
							name: "Associated Token Account",
							upgradeable: false,
						},
					},
					{
						name: "System Program",
						value: {
							id: "11111111111111111111111111111112",
							name: "System Program",
							upgradeable: false,
						},
					},
					{
						name: "Token Program",
						value: {
							id: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
							name: "Token Program",
							upgradeable: false,
						},
					},
					{
						name: "Token Program 2022",
						value: {
							id: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
							name: "Token Program 2022",
							upgradeable: true,
						},
					},
					{
						name: "Rent Sysvar",
						value: {
							id: "SysvarRent111111111111111111111111111111111",
							name: "Rent Sysvar",
							upgradeable: false,
						},
					},
					{
						name: "Clock Sysvar",
						value: {
							id: "SysvarC1ock11111111111111111111111111111111",
							name: "Clock Sysvar",
							upgradeable: false,
						},
					},
					{
						name: "Jupiter V6 Program",
						value: {
							id: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
							name: "Jupiter V6",
							upgradeable: true,
						},
					},
					{
						name: "Raydium AMM Program",
						value: {
							id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
							name: "Raydium AMM",
							upgradeable: false,
						},
					},
					{
						name: "Serum DEX Program",
						value: {
							id: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
							name: "Serum DEX",
							upgradeable: false,
						},
					},
					{
						name: "Custom (enter program ID manually)",
						value: "custom",
					},
				],
			},
		]);

		if (programChoice === "custom") {
			const answers = await inquirer.prompt([
				{
					type: "input",
					name: "programId",
					message: "Enter program ID:",
					validate: (input) =>
						input.trim().length > 0 || "Program ID is required",
				},
				{
					type: "input",
					name: "name",
					message: "Enter program name (optional):",
					default: "",
				},
				{
					type: "confirm",
					name: "upgradeable",
					message: "Is this an upgradeable program?",
					default: false,
				},
			]);

			programId = answers.programId;
			programName = answers.name || undefined;
			upgradeable = answers.upgradeable;
		} else {
			programId = programChoice.id;
			programName = programChoice.name;
			upgradeable = programChoice.upgradeable;
		}
	} else {
		// Non-interactive mode
		if (!options.programId) {
			console.error(chalk.red("❌ Program ID is required"));
			console.log(
				chalk.gray(
					"💡 Use --program-id flag, or run without flags for interactive mode",
				),
			);
			return;
		}

		programId = options.programId;
		programName = options.name;
		// Default to false for CLI, could add --upgradeable flag later
		upgradeable = false;
	}

	try {
		// Check if program already exists in config
		const existingProgram = config.programs.find(
			(p) => p.mainnetProgramId === programId,
		);
		if (existingProgram) {
			console.log(
				chalk.yellow(`⚠️  Program ${programId} already exists in configuration`),
			);
			console.log(chalk.gray(`   Name: ${existingProgram.name || "unnamed"}`));
			return;
		}

		// Verify program exists on mainnet first
		console.log(chalk.gray("🔍 Verifying program exists on mainnet..."));
		const programCloner = new ProgramCloner();
		const programInfo = await programCloner.getProgramInfo(
			programId,
			"mainnet-beta",
		);

		if (!programInfo.exists) {
			console.error(chalk.red(`❌ Program ${programId} not found on mainnet`));
			return;
		}

		if (!programInfo.executable) {
			console.error(chalk.red(`❌ ${programId} is not an executable program`));
			return;
		}

		console.log(
			chalk.gray(`  ✓ Found executable program (${programInfo.size} bytes)`),
		);

		// Create new program config
		const newProgram: ProgramConfig = {
			name: programName,
			mainnetProgramId: programId,
			upgradeable: upgradeable,
			cluster: "mainnet-beta",
			dependencies: [],
		};

		// Add to config
		config.programs.push(newProgram);

		// Save updated config
		await configManager.save("./sf.config.json");

		console.log(
			chalk.green(
				`\n✅ Successfully added ${programName || programId} to configuration!`,
			),
		);
		console.log(chalk.cyan(`📝 Updated sf.config.json`));
		console.log(chalk.gray(`   Program ID: ${programId}`));
		console.log(chalk.gray(`   Upgradeable: ${upgradeable ? "Yes" : "No"}`));

		// Check if there are running validators
		await processRegistry.cleanup();
		const validators = processRegistry.getRunning();

		if (validators.length > 0) {
			console.log(
				chalk.yellow(`\n⚠️  Found ${validators.length} running validator(s)`),
			);
			console.log(
				chalk.gray("💡 Programs are added to genesis config and require RESET"),
			);
			console.log(chalk.red("   ⚠️  RESET will WIPE all ledger data!"));
			console.log(
				chalk.gray(
					`   1. Stop validators using "${config.name}": solforge stop <validator-id>`,
				),
			);
			console.log(chalk.gray("   2. Start with reset: solforge start"));

			const { shouldRestart } = await inquirer.prompt([
				{
					type: "confirm",
					name: "shouldRestart",
					message: "⚠️  Reset validators now? (This will WIPE all ledger data)",
					default: false,
				},
			]);

			if (shouldRestart) {
				console.log(chalk.yellow("\n🔄 Resetting validators..."));
				console.log(chalk.red("⚠️  This will delete all ledger data!"));

				// Import the commands we need
				const { stopCommand } = await import("./stop.js");
				const { startCommand } = await import("./start.js");

				// Get current config for modifications
				const currentConfig = configManager.getConfig();

				// Stop validators that use this config
				const configName = currentConfig.name;
				const matchingValidators = validators.filter((v) =>
					v.name.startsWith(configName),
				);

				if (matchingValidators.length > 0) {
					console.log(
						chalk.gray(
							`🛑 Stopping ${matchingValidators.length} validator(s) using config "${configName}"...`,
						),
					);

					for (const validator of matchingValidators) {
						await stopCommand(validator.id, {});
					}
				}

				// Wait a moment for clean shutdown
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Temporarily enable reset for this start
				const originalReset = currentConfig.localnet.reset;
				currentConfig.localnet.reset = true;

				console.log(
					chalk.cyan(
						"🚀 Starting validator with reset to apply program changes...",
					),
				);

				// Start new validator (will reset due to config)
				await startCommand(false);

				// Restore original reset setting
				currentConfig.localnet.reset = originalReset;
				await configManager.save("./sf.config.json");
			}
		} else {
			console.log(
				chalk.gray(
					"\n💡 Start a validator to use the new program: solforge start",
				),
			);
		}
	} catch (error) {
		console.error(chalk.red("❌ Failed to add program:"));
		console.error(
			chalk.red(`   ${error instanceof Error ? error.message : String(error)}`),
		);
	}
}
