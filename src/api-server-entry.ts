#!/usr/bin/env node

import { APIServer } from "./services/api-server.js";
import { configManager } from "./config/manager.js";
import chalk from "chalk";

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const portIndex = args.indexOf("--port");
    const hostIndex = args.indexOf("--host");
    const configIndex = args.indexOf("--config");
    const rpcIndex = args.indexOf("--rpc-url");
    const faucetIndex = args.indexOf("--faucet-url");
    const workDirIndex = args.indexOf("--work-dir");

    if (
      portIndex === -1 ||
      configIndex === -1 ||
      rpcIndex === -1 ||
      faucetIndex === -1 ||
      workDirIndex === -1 ||
      !args[portIndex + 1] ||
      !args[configIndex + 1] ||
      !args[rpcIndex + 1] ||
      !args[faucetIndex + 1] ||
      !args[workDirIndex + 1]
    ) {
      console.error(
        "Usage: api-server-entry --port <port> --config <config-path> --rpc-url <url> --faucet-url <url> --work-dir <dir> [--host <host>]"
      );
      process.exit(1);
    }

    const port = parseInt(args[portIndex + 1]!);
    const host =
      hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : undefined;
    const configPath = args[configIndex + 1]!;
    const rpcUrl = args[rpcIndex + 1]!;
    const faucetUrl = args[faucetIndex + 1]!;
    const workDir = args[workDirIndex + 1]!;

    // Load configuration
    await configManager.load(configPath);
    const config = configManager.getConfig();

    // Create and start API server
    const apiServer = new APIServer({
      port,
      host,
      validatorRpcUrl: rpcUrl,
      validatorFaucetUrl: faucetUrl,
      config,
      workDir,
    });

    const result = await apiServer.start();

    if (result.success) {
      console.log(chalk.green(`🚀 API Server started on port ${port}`));

      // Keep the process alive
      process.on("SIGTERM", async () => {
        console.log(
          chalk.yellow("📡 API Server received SIGTERM, shutting down...")
        );
        await apiServer.stop();
        process.exit(0);
      });

      process.on("SIGINT", async () => {
        console.log(
          chalk.yellow("📡 API Server received SIGINT, shutting down...")
        );
        await apiServer.stop();
        process.exit(0);
      });

      // Keep process alive
      setInterval(() => {}, 1000);
    } else {
      console.error(
        chalk.red(`❌ Failed to start API server: ${result.error}`)
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `❌ API Server error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `❌ Fatal error: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exit(1);
});
