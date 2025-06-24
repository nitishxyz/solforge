import { Command } from "commander";
import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { input, select } from "@inquirer/prompts";
import { runCommand } from "../utils/shell";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  loadClonedTokens,
  findTokenBySymbol,
  type ClonedToken,
} from "../utils/token-loader.js";
import type { TokenConfig } from "../types/config.js";

export const mintCommand = new Command()
  .name("mint")
  .description("Interactively mint tokens to any wallet address")
  .option("--rpc-url <url>", "RPC URL to use", "http://127.0.0.1:8899")
  .option("--symbol <symbol>", "Token symbol to mint")
  .option("--wallet <address>", "Wallet address to mint to")
  .option("--amount <amount>", "Amount to mint")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🪙 Interactive Token Minting"));
      console.log(chalk.gray("Mint tokens to any wallet address\n"));

      // Check if solforge data exists
      const workDir = ".solforge";
      if (!existsSync(workDir)) {
        console.error(
          chalk.red("❌ No solforge data found. Run 'solforge start' first.")
        );
        process.exit(1);
      }

      // Load available tokens
      const tokens = await loadAvailableTokens(workDir);

      if (tokens.length === 0) {
        console.error(
          chalk.red(
            "❌ No tokens found. Run 'solforge start' first to clone tokens."
          )
        );
        process.exit(1);
      }

      // Display available tokens
      console.log(chalk.cyan("📋 Available Tokens:"));
      tokens.forEach((token, index) => {
        console.log(
          chalk.gray(
            `  ${index + 1}. ${token.config.symbol} (${
              token.config.mainnetMint
            })`
          )
        );
      });
      console.log();

      // Select token (or use provided symbol)
      let selectedToken: ClonedToken;
      if (options.symbol) {
        const token = findTokenBySymbol(tokens, options.symbol);
        if (!token) {
          console.error(
            chalk.red(`❌ Token ${options.symbol} not found in cloned tokens`)
          );
          process.exit(1);
        }
        selectedToken = token;
        console.log(
          chalk.gray(`Selected token: ${selectedToken.config.symbol}`)
        );
      } else {
        selectedToken = await select({
          message: "Select a token to mint:",
          choices: tokens.map((token) => ({
            name: `${token.config.symbol} (${token.config.mainnetMint})`,
            value: token,
          })),
        });
      }

      // Get recipient address (or use provided wallet)
      let recipientAddress: string;
      if (options.wallet) {
        recipientAddress = options.wallet;
        // Validate wallet address
        try {
          new PublicKey(recipientAddress);
        } catch {
          console.error(chalk.red("❌ Invalid wallet address"));
          process.exit(1);
        }
        console.log(chalk.gray(`Recipient wallet: ${recipientAddress}`));
      } else {
        recipientAddress = await input({
          message: "Enter recipient wallet address:",
          validate: (value: string) => {
            if (!value.trim()) {
              return "Please enter a valid address";
            }
            try {
              new PublicKey(value.trim());
              return true;
            } catch {
              return "Please enter a valid Solana address";
            }
          },
        });
      }

      // Get amount to mint (or use provided amount)
      let amount: string;
      if (options.amount) {
        const num = parseFloat(options.amount);
        if (isNaN(num) || num <= 0) {
          console.error(chalk.red("❌ Invalid amount"));
          process.exit(1);
        }
        amount = options.amount;
        console.log(chalk.gray(`Amount to mint: ${amount}`));
      } else {
        amount = await input({
          message: "Enter amount to mint:",
          validate: (value: string) => {
            const num = parseFloat(value);
            if (isNaN(num) || num <= 0) {
              return "Please enter a valid positive number";
            }
            return true;
          },
        });
      }

      // Confirm minting if interactive
      if (!options.symbol || !options.wallet || !options.amount) {
        const confirm = await input({
          message: `Confirm minting ${amount} ${selectedToken.config.symbol} to ${recipientAddress}? (y/N):`,
          default: "N",
        });

        if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
          console.log(chalk.yellow("Minting cancelled."));
          process.exit(0);
        }
      }

      console.log(chalk.blue("🚀 Starting mint..."));

      // Execute mint
      await mintTokenToWallet(
        selectedToken,
        recipientAddress,
        parseFloat(amount),
        options.rpcUrl
      );

      console.log(
        chalk.green(
          `✅ Successfully minted ${amount} ${selectedToken.config.symbol} to ${recipientAddress}`
        )
      );
    } catch (error) {
      console.error(chalk.red(`❌ Mint failed: ${error}`));
      process.exit(1);
    }
  });

async function loadAvailableTokens(workDir: string): Promise<ClonedToken[]> {
  try {
    // Load token config from sf.config.json
    const configPath = "sf.config.json";
    if (!existsSync(configPath)) {
      throw new Error("sf.config.json not found in current directory");
    }

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const tokenConfigs: TokenConfig[] = config.tokens || [];

    // Use the shared token loader
    return await loadClonedTokens(tokenConfigs, workDir);
  } catch (error) {
    throw new Error(`Failed to load tokens: ${error}`);
  }
}

export async function mintTokenToWallet(
  token: ClonedToken,
  walletAddress: string,
  amount: number,
  rpcUrl: string
): Promise<void> {
  // Check if associated token account already exists (same pattern as token-cloner.ts)
  console.log(chalk.gray(`🔍 Checking for existing token account...`));

  const checkAccountsResult = await runCommand(
    "spl-token",
    ["accounts", "--owner", walletAddress, "--url", rpcUrl, "--output", "json"],
    { silent: true }
  );

  let tokenAccountAddress = "";

  if (checkAccountsResult.success && checkAccountsResult.stdout) {
    try {
      const accountsData = JSON.parse(checkAccountsResult.stdout);

      // Look for existing token account for this mint
      for (const account of accountsData.accounts || []) {
        if (account.mint === token.config.mainnetMint) {
          tokenAccountAddress = account.address;
          console.log(
            chalk.gray(
              `ℹ️  Found existing token account: ${tokenAccountAddress}`
            )
          );
          break;
        }
      }
    } catch (error) {
      // No existing accounts found or parsing error, will create new account
    }
  }

  if (!tokenAccountAddress) {
    // Account doesn't exist, create it (same pattern as token-cloner.ts)
    console.log(chalk.gray(`🔧 Creating token account...`));

    const createAccountResult = await runCommand(
      "spl-token",
      [
        "create-account",
        token.config.mainnetMint,
        "--owner",
        walletAddress,
        "--fee-payer",
        token.mintAuthorityPath,
        "--url",
        rpcUrl,
      ],
      { silent: false }
    );

    if (!createAccountResult.success) {
      throw new Error(
        `Failed to create token account: ${createAccountResult.stderr}`
      );
    }

    // Extract token account address from create-account output
    const match = createAccountResult.stdout.match(/Creating account (\S+)/);
    tokenAccountAddress = match?.[1] || "";

    if (!tokenAccountAddress) {
      throw new Error(
        "Failed to determine token account address from create-account output"
      );
    }

    console.log(chalk.gray(`✅ Created token account: ${tokenAccountAddress}`));
  }

  // Now mint to the token account (same pattern as token-cloner.ts)
  console.log(chalk.gray(`💰 Minting ${amount} tokens...`));

  const result = await runCommand(
    "spl-token",
    [
      "mint",
      token.config.mainnetMint,
      amount.toString(),
      tokenAccountAddress,
      "--mint-authority",
      token.mintAuthorityPath,
      "--fee-payer",
      token.mintAuthorityPath,
      "--url",
      rpcUrl,
    ],
    { silent: false }
  );

  if (!result.success) {
    throw new Error(`Failed to mint tokens: ${result.stderr}`);
  }
}
