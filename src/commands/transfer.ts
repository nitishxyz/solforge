import { Command } from "commander";
import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { input, select } from "@inquirer/prompts";
import { runCommand } from "../utils/shell";
import { Keypair } from "@solana/web3.js";

interface TokenBalance {
  mint: string;
  symbol: string;
  address: string;
  balance: string;
  decimals: number;
}

interface TokenConfig {
  symbol: string;
  mainnetMint: string;
  mintAmount: number;
}

export const transferCommand = new Command()
  .name("transfer")
  .description(
    "Interactively transfer tokens from mint authority to any address"
  )
  .option("--rpc-url <url>", "RPC URL to use", "http://127.0.0.1:8899")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔄 Interactive Token Transfer"));
      console.log(
        chalk.gray("Send tokens from mint authority to any address\n")
      );

      // Check if testpilot data exists
      const workDir = ".testpilot";
      if (!existsSync(workDir)) {
        console.error(
          chalk.red("❌ No testpilot data found. Run 'testpilot start' first.")
        );
        process.exit(1);
      }

      // Load available tokens and their balances
      const tokens = await loadAvailableTokens(workDir, options.rpcUrl);

      if (tokens.length === 0) {
        console.error(
          chalk.red(
            "❌ No tokens found. Run 'testpilot start' first to clone tokens."
          )
        );
        process.exit(1);
      }

      // Display available tokens
      console.log(chalk.cyan("📋 Available Tokens:"));
      tokens.forEach((token, index) => {
        console.log(
          chalk.gray(
            `  ${index + 1}. ${token.symbol} (${token.mint}) - Balance: ${
              token.balance
            }`
          )
        );
      });
      console.log();

      // Select token
      const selectedToken = await select({
        message: "Select a token to transfer:",
        choices: tokens.map((token, index) => ({
          name: `${token.symbol} - Balance: ${token.balance}`,
          value: token,
        })),
      });

      // Get recipient address
      const recipientAddress = await input({
        message: "Enter recipient address (wallet address or PDA):",
        validate: (value: string) => {
          if (!value.trim()) {
            return "Please enter a valid address";
          }
          // Basic length check for Solana addresses
          if (value.trim().length < 32 || value.trim().length > 44) {
            return "Please enter a valid Solana address (32-44 characters)";
          }
          return true;
        },
      });

      // Get amount to transfer
      const maxAmount = parseFloat(selectedToken.balance);
      const amount = await input({
        message: `Enter amount to transfer (max: ${selectedToken.balance}):`,
        validate: (value: string) => {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) {
            return "Please enter a valid positive number";
          }
          if (num > maxAmount) {
            return `Amount cannot exceed available balance: ${selectedToken.balance}`;
          }
          return true;
        },
      });

      // Use amount as-is (spl-token expects UI amount, not base units)
      const transferAmount = amount;

      // Confirm transfer
      const confirm = await input({
        message: `Confirm transfer of ${amount} ${selectedToken.symbol} to ${recipientAddress}? (y/N):`,
        default: "N",
      });

      if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
        console.log(chalk.yellow("Transfer cancelled."));
        process.exit(0);
      }

      console.log(chalk.blue("🚀 Starting transfer..."));

      // Execute transfer
      await executeTransfer(
        selectedToken,
        recipientAddress,
        transferAmount.toString(),
        options.rpcUrl,
        workDir
      );

      console.log(
        chalk.green(
          `✅ Successfully transferred ${amount} ${selectedToken.symbol} to ${recipientAddress}`
        )
      );
    } catch (error) {
      console.error(chalk.red(`❌ Transfer failed: ${error}`));
      process.exit(1);
    }
  });

async function loadAvailableTokens(
  workDir: string,
  rpcUrl: string
): Promise<TokenBalance[]> {
  const tokens: TokenBalance[] = [];

  try {
    // Load shared mint authority secret key and generate keypair
    const sharedMintAuthorityPath = join(workDir, "shared-mint-authority.json");
    if (!existsSync(sharedMintAuthorityPath)) {
      throw new Error("Shared mint authority not found");
    }

    const secretKeyArray = JSON.parse(
      readFileSync(sharedMintAuthorityPath, "utf8")
    );
    const mintAuthorityKeypair = Keypair.fromSecretKey(
      new Uint8Array(secretKeyArray)
    );
    const mintAuthorityAddress = mintAuthorityKeypair.publicKey.toBase58();

    // Load token config from tp.config.json
    const configPath = "tp.config.json";
    if (!existsSync(configPath)) {
      throw new Error("tp.config.json not found in current directory");
    }

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const tokenConfigs: TokenConfig[] = config.tokens || [];

    // Get token account balances
    const accountsResult = await runCommand(
      "spl-token",
      [
        "accounts",
        "--owner",
        mintAuthorityAddress,
        "--url",
        rpcUrl,
        "--output",
        "json",
      ],
      { silent: true }
    );

    if (!accountsResult.success) {
      throw new Error(
        `Failed to fetch token accounts: ${accountsResult.stderr}`
      );
    }

    const accountsData = JSON.parse(accountsResult.stdout);

    // Match accounts with token config
    for (const account of accountsData.accounts || []) {
      const tokenInfo = tokenConfigs.find(
        (token: TokenConfig) => token.mainnetMint === account.mint
      );
      if (tokenInfo) {
        tokens.push({
          mint: account.mint,
          symbol: tokenInfo.symbol,
          address: account.address,
          balance: account.tokenAmount.uiAmountString,
          decimals: account.tokenAmount.decimals,
        });
      }
    }

    return tokens;
  } catch (error) {
    throw new Error(`Failed to load tokens: ${error}`);
  }
}

async function executeTransfer(
  token: TokenBalance,
  recipientAddress: string,
  amount: string,
  rpcUrl: string,
  workDir: string
): Promise<void> {
  // Load mint authority keypair path
  const sharedMintAuthorityPath = join(workDir, "shared-mint-authority.json");

  // Transfer tokens directly to wallet address
  // The --fund-recipient flag will automatically create the associated token account if needed
  console.log(chalk.gray("💸 Transferring tokens..."));

  const transferResult = await runCommand(
    "spl-token",
    [
      "transfer",
      token.mint,
      amount,
      recipientAddress,
      "--from",
      token.address,
      "--owner",
      sharedMintAuthorityPath,
      "--fee-payer",
      sharedMintAuthorityPath,
      "--fund-recipient",
      "--allow-unfunded-recipient",
      "--url",
      rpcUrl,
    ],
    { silent: false }
  );

  if (!transferResult.success) {
    throw new Error(`Transfer failed: ${transferResult.stderr}`);
  }
}
