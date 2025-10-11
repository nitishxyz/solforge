import chalk from "chalk";
import { existsSync, writeFileSync } from "node:fs";
import inquirer from "inquirer";
import { resolve } from "node:path";
import type { Config } from "../types/config.js";

const defaultConfig: Config = {
	name: "my-localnet",
	description: "Local Solana development environment",
	tokens: [
		{
			symbol: "USDC",
			mainnetMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			recipients: [],
			mintAmount: 1000000,
			cloneMetadata: true,
		},
	],
	programs: [],
	localnet: {
		airdropAmount: 100,
		faucetAccounts: [],
		port: 8899,
		faucetPort: 9900,
		reset: false,
		logLevel: "info",
		bindAddress: "127.0.0.1",
		quiet: false,
		rpc: "https://api.mainnet-beta.solana.com",
		limitLedgerSize: 100000,
	},
	agi: {
		enabled: false,
		port: 3456,
		host: "127.0.0.1",
		provider: "openrouter",
		model: "anthropic/claude-3.5-sonnet",
		agent: "general",
	},
};

export async function initCommand(): Promise<void> {
	const configPath = resolve(process.cwd(), "sf.config.json");

	// Check if config already exists
	if (existsSync(configPath)) {
		const { overwrite } = await inquirer.prompt([
			{
				type: "confirm",
				name: "overwrite",
				message: "sf.config.json already exists. Overwrite?",
				default: false,
			},
		]);

		if (!overwrite) {
			console.log(chalk.yellow("⚠️  Initialization cancelled"));
			return;
		}
	}

	// Gather basic configuration
	const answers = await inquirer.prompt([
		{
			type: "input",
			name: "name",
			message: "Project name:",
			default: "my-localnet",
		},
		{
			type: "input",
			name: "description",
			message: "Description:",
			default: "Local Solana development environment",
		},
		{
			type: "number",
			name: "port",
			message: "RPC port:",
			default: 8899,
		},
		{
			type: "confirm",
			name: "includeUsdc",
			message: "Include USDC token?",
			default: true,
		},
		{
			type: "confirm",
			name: "enableAgi",
			message: "Enable AGI CLI server (AI coding assistant)?",
			default: false,
		},
	]);

	// AGI configuration (if enabled)
	let agiConfig = defaultConfig.agi;
	if (answers.enableAgi) {
		const agiAnswers = await inquirer.prompt([
			{
				type: "number",
				name: "agiPort",
				message: "AGI server port:",
				default: 3456,
			},
			{
				type: "list",
				name: "provider",
				message: "AI provider:",
				choices: [
					{ name: "OpenRouter (recommended)", value: "openrouter" },
					{ name: "Anthropic", value: "anthropic" },
					{ name: "OpenAI", value: "openai" },
				],
				default: "openrouter",
			},
			{
				type: "input",
				name: "model",
				message: "Model name:",
				default: (answers: { provider: string }) => {
					switch (answers.provider) {
						case "anthropic":
							return "claude-3-5-sonnet-20241022";
						case "openai":
							return "gpt-4";
						default:
							return "anthropic/claude-3.5-sonnet";
					}
				},
			},
			{
				type: "list",
				name: "agent",
				message: "Default agent:",
				choices: [
					{ name: "General (for general coding)", value: "general" },
					{ name: "Build (for build/deployment tasks)", value: "build" },
				],
				default: "general",
			},
			{
				type: "password",
				name: "apiKey",
				message: "API Key (optional, can use env var):",
				mask: "*",
				default: "",
			},
		]);

		agiConfig = {
			enabled: true,
			port: agiAnswers.agiPort,
			host: "127.0.0.1",
			provider: agiAnswers.provider,
			model: agiAnswers.model,
			agent: agiAnswers.agent,
			apiKey: agiAnswers.apiKey || undefined,
		};
	}

	// Build config
	const config: Config = {
		...defaultConfig,
		name: answers.name,
		description: answers.description,
		localnet: {
			...defaultConfig.localnet,
			port: answers.port,
		},
		agi: agiConfig,
	};

	if (!answers.includeUsdc) {
		config.tokens = [];
	}

	try {
		// Write config file
		writeFileSync(configPath, JSON.stringify(config, null, 2));

		console.log(chalk.green("✅ sf.config.json created successfully!"));
		console.log(chalk.gray(`📄 Config saved to: ${configPath}`));
		console.log();
		console.log(chalk.blue("Next steps:"));
		console.log(
			chalk.gray("1. Edit sf.config.json to add your tokens and programs"),
		);
		console.log(chalk.gray("2. Run `solforge start` to launch your localnet"));
		console.log();

		if (config.agi.enabled) {
			console.log(chalk.blue("🤖 AGI Server Configuration:"));
			console.log(chalk.gray(`   - Port: ${config.agi.port}`));
			console.log(chalk.gray(`   - Provider: ${config.agi.provider}`));
			console.log(chalk.gray(`   - Model: ${config.agi.model}`));
			if (!config.agi.apiKey) {
				console.log(
					chalk.yellow(
						`   ⚠️  Set your API key in environment variable: ${config.agi.provider.toUpperCase()}_API_KEY`,
					),
				);
			}
			console.log();
		}

		console.log(
			chalk.yellow(
				"💡 Tip: Check configs/example.sf.config.json for more examples",
			),
		);
	} catch (error) {
		console.error(chalk.red("❌ Failed to create sf.config.json"));
		console.error(
			chalk.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
