import inquirer from "inquirer";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "../types/config";
import chalk from "chalk";

const defaultConfig: Config = {
	name: "solforge-localnet",
	description: "Local Solana development environment",
	tokens: [],
	programs: [],
	localnet: {
		port: 8899,
		faucetPort: 9900,
		airdropAmount: 100,
		faucetAccounts: [],
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
		agent: "general",
	},
};

export async function initCommand(): Promise<void> {
	const configPath = resolve(process.cwd(), "sf.config.json");

	console.log(chalk.cyan.bold("\n🔨 SolForge Configuration Setup\n"));

	const answers = await inquirer.prompt([
		{
			type: "input",
			name: "name",
			message: "Project name:",
			default: "solforge-localnet",
		},
		{
			type: "input",
			name: "description",
			message: "Project description:",
			default: "Local Solana development environment",
		},
		{
			type: "confirm",
			name: "includeWSOL",
			message: "Include wrapped SOL token?",
			default: true,
		},
		{
			type: "confirm",
			name: "includeUSDC",
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
				message: "AI provider (optional - AGI handles fallback):",
				choices: [
					{ name: "None (use AGI defaults)", value: undefined },
					{ name: "OpenRouter", value: "openrouter" },
					{ name: "Anthropic", value: "anthropic" },
					{ name: "OpenAI", value: "openai" },
				],
				default: undefined,
			},
			{
				type: "input",
				name: "model",
				message: "Model name (optional):",
				default: "",
				when: (answers: { provider?: string }) => !!answers.provider,
			},
			{
				type: "input",
				name: "apiKey",
				message: "API key (optional - uses env var if blank):",
				default: "",
				when: (answers: { provider?: string }) => !!answers.provider,
			},
			{
				type: "list",
				name: "agent",
				message: "AGI agent mode:",
				choices: [
					{ name: "General", value: "general" },
					{ name: "Build", value: "build" },
				],
				default: "general",
			},
		]);

		agiConfig = {
			enabled: true,
			port: agiAnswers.agiPort,
			host: "127.0.0.1",
			...(agiAnswers.provider && { provider: agiAnswers.provider }),
			...(agiAnswers.model && { model: agiAnswers.model }),
			...(agiAnswers.apiKey && { apiKey: agiAnswers.apiKey }),
			agent: agiAnswers.agent || "general",
		};
	}

	const tokens: Array<{
		symbol: string;
		mainnetMint: string;
		cloneMetadata: boolean;
	}> = [];

	if (answers.includeWSOL) {
		tokens.push({
			symbol: "WSOL",
			mainnetMint: "So11111111111111111111111111111111111111112",
			cloneMetadata: true,
		});
	}

	if (answers.includeUSDC) {
		tokens.push({
			symbol: "USDC",
			mainnetMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			cloneMetadata: true,
		});
	}

	const config: Config = {
		name: answers.name,
		description: answers.description,
		tokens,
		programs: [],
		localnet: defaultConfig.localnet,
		agi: agiConfig,
	};

	writeFileSync(configPath, JSON.stringify(config, null, 2));

	console.log(chalk.green(`\n✅ Configuration written to ${configPath}\n`));

	if (tokens.length > 0) {
		console.log(chalk.blue("📦 Tokens to clone:"));
		for (const token of tokens) {
			console.log(
				chalk.gray(`   - ${token.symbol} (${token.mainnetMint.slice(0, 8)}...)`),
			);
		}
		console.log();
	}

	if (agiConfig.enabled) {
		console.log(chalk.blue("🤖 AGI Server Configuration:"));
		console.log(chalk.gray(`   Port: ${agiConfig.port}`));
		if (agiConfig.provider) {
			console.log(chalk.gray(`   Provider: ${agiConfig.provider}`));
		}
		if (agiConfig.model) {
			console.log(chalk.gray(`   Model: ${agiConfig.model}`));
		}
		console.log(chalk.gray(`   Agent: ${agiConfig.agent}`));
		console.log();
	}

	console.log(chalk.cyan("Next steps:"));
	console.log(chalk.gray("   1. Run 'solforge start' to launch the localnet"));
	console.log(
		chalk.gray("   2. Use 'solforge mint <token>' to mint tokens to your wallet"),
	);
	console.log();
}
