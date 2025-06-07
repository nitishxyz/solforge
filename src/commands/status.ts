import chalk from "chalk";
import { runCommand, checkSolanaTools } from "../utils/shell.js";
import { configManager } from "../config/manager.js";

export async function statusCommand(): Promise<void> {
  console.log(chalk.blue("📊 Checking system status...\n"));

  // Check Solana CLI tools
  console.log(chalk.cyan("🔧 Solana CLI Tools:"));
  const tools = await checkSolanaTools();

  console.log(
    `  ${tools.solana ? "✅" : "❌"} solana CLI: ${
      tools.solana ? "Available" : "Not found"
    }`
  );
  console.log(
    `  ${tools.splToken ? "✅" : "❌"} spl-token CLI: ${
      tools.splToken ? "Available" : "Not found"
    }`
  );

  if (!tools.solana || !tools.splToken) {
    console.log(chalk.yellow("\n💡 Install Solana CLI tools:"));
    console.log(
      chalk.gray(
        '   sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"'
      )
    );
    console.log();
  }

  // Check if validator is running
  console.log(chalk.cyan("\n🏗️  Validator Status:"));

  try {
    // Try to load config to get port
    const configPath = configManager.getConfigPath() || "./tp.config.json";
    await configManager.load(configPath);
    const config = configManager.getConfig();

    const port = config.localnet.port;
    const rpcUrl = `http://127.0.0.1:${port}`;

    // Check if validator is running by testing health endpoint
    const healthResult = await runCommand(
      "curl",
      [
        "-X",
        "POST",
        "-H",
        "Content-Type: application/json",
        "-d",
        '{"jsonrpc":"2.0","id":1,"method":"getHealth"}',
        rpcUrl,
      ],
      { silent: true, jsonOutput: false }
    );

    if (healthResult.success) {
      console.log(`  ✅ Validator running on port ${port}`);
      console.log(`  🌐 RPC URL: ${rpcUrl}`);

      // Get additional validator info
      const slotResult = await runCommand(
        "solana",
        ["slot", "--url", rpcUrl, "--output", "json"],
        { silent: true, jsonOutput: true }
      );

      if (slotResult.success && typeof slotResult.stdout === "object") {
        console.log(`  📊 Current slot: ${slotResult.stdout}`);
      }
    } else {
      console.log(`  ❌ Validator not running on port ${port}`);
      console.log(`  💡 Run 'testpilot start' to launch the validator`);
    }
  } catch (error) {
    console.log(`  ❓ Status unknown - no valid config found`);
    console.log(`  💡 Run 'testpilot init' to create a configuration`);
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
    console.log(`  💡 Run 'testpilot init' to create one`);
  }

  console.log();
}
