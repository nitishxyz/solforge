import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import type { Config } from "../types/config.js";

const defaultConfig: Config = {
  name: "my-localnet",
  description: "Local Solana development environment",
  tokens: [
    {
      symbol: "USDC",
      mainnetMint: "EPjFWdd5AufqSSqeM2qM9F9fydVWYxi5g5FbwUoib6LP",
      recipients: [],
      mintAmount: 1000000,
    },
  ],
  programs: [],
  localnet: {
    airdropAmount: 100,
    faucetAccounts: [],
    port: 8899,
    faucetPort: 9900,
    reset: true,
    logLevel: "info",
    bindAddress: "127.0.0.1",
    quiet: false,
    rpc: "https://mainnet.helius-rpc.com/?api-key=3a3b84ef-2985-4543-9d67-535eb707b6ec",
  },
};

export async function initCommand(): Promise<void> {
  const configPath = resolve(process.cwd(), "tp.config.json");

  // Check if config already exists
  if (existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "tp.config.json already exists. Overwrite?",
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
  ]);

  // Build config
  const config: Config = {
    ...defaultConfig,
    name: answers.name,
    description: answers.description,
    localnet: {
      ...defaultConfig.localnet,
      port: answers.port,
    },
  };

  if (!answers.includeUsdc) {
    config.tokens = [];
  }

  try {
    // Write config file
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green("✅ tp.config.json created successfully!"));
    console.log(chalk.gray(`📄 Config saved to: ${configPath}`));
    console.log();
    console.log(chalk.blue("Next steps:"));
    console.log(
      chalk.gray("1. Edit tp.config.json to add your tokens and programs")
    );
    console.log(chalk.gray("2. Run `testpilot start` to launch your localnet"));
    console.log();
    console.log(
      chalk.yellow(
        "💡 Tip: Check configs/example.tp.config.json for more examples"
      )
    );
  } catch (error) {
    console.error(chalk.red("❌ Failed to create tp.config.json"));
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
}
