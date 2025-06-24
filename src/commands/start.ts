import chalk from "chalk";
import ora from "ora";
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { runCommand, checkSolanaTools } from "../utils/shell.js";
import { configManager } from "../config/manager.js";
import { TokenCloner } from "../services/token-cloner.js";
import { processRegistry } from "../services/process-registry.js";
import { portManager } from "../services/port-manager.js";

import type { Config, TokenConfig } from "../types/config.js";
import type { ClonedToken } from "../services/token-cloner.js";
import type { RunningValidator } from "../services/process-registry.js";

function generateValidatorId(name: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const safeName = name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `${safeName}-${timestamp}-${randomSuffix}`;
}

export async function startCommand(
  debug: boolean = false,
  network: boolean = false
): Promise<void> {
  // Check prerequisites
  const tools = await checkSolanaTools();
  if (!tools.solana) {
    console.error(chalk.red("❌ solana CLI not found"));
    console.log(
      chalk.yellow(
        "💡 Install it with: sh -c \"$(curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash)\""
      )
    );
    process.exit(1);
  }

  // Load configuration
  let config: Config;
  try {
    await configManager.load("./sf.config.json");
    config = configManager.getConfig();
  } catch (error) {
    console.error(chalk.red("❌ Failed to load sf.config.json"));
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    console.log(
      chalk.yellow("💡 Run `solforge init` to create a configuration")
    );
    process.exit(1);
  }

  // Check if validator is already running on configured ports first
  const checkResult = await runCommand(
    "curl",
    [
      "-s",
      "-X",
      "POST",
      `http://127.0.0.1:${config.localnet.port}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      '{"jsonrpc":"2.0","id":1,"method":"getHealth"}',
    ],
    { silent: true, debug: false }
  );

  if (checkResult.success && checkResult.stdout.includes("ok")) {
    console.log(chalk.yellow("⚠️  Validator is already running"));
    console.log(
      chalk.cyan(`🌐 RPC URL: http://127.0.0.1:${config.localnet.port}`)
    );
    console.log(
      chalk.cyan(
        `💰 Faucet URL: http://127.0.0.1:${config.localnet.faucetPort}`
      )
    );

    // Clone tokens if needed, even when validator is already running
    let clonedTokens: ClonedToken[] = [];
    if (config.tokens.length > 0) {
      const tokenCloner = new TokenCloner();

      // Check which tokens are already cloned and which need to be cloned
      const { existingTokens, tokensToClone } = await checkExistingClonedTokens(
        config.tokens,
        tokenCloner
      );

      if (existingTokens.length > 0) {
        console.log(
          chalk.green(`📁 Found ${existingTokens.length} already cloned tokens`)
        );
        if (debug) {
          existingTokens.forEach((token: ClonedToken) => {
            console.log(
              chalk.gray(
                `  ✓ ${token.config.symbol} (${token.config.mainnetMint})`
              )
            );
          });
        }
        clonedTokens.push(...existingTokens);
      }

      if (tokensToClone.length > 0) {
        console.log(
          chalk.yellow(
            `📦 Cloning ${tokensToClone.length} new tokens from mainnet...\n`
          )
        );
        try {
          const newlyClonedTokens = await tokenCloner.cloneTokens(
            tokensToClone,
            config.localnet.rpc,
            debug
          );
          clonedTokens.push(...newlyClonedTokens);
          console.log(
            chalk.green(
              `✅ Successfully cloned ${newlyClonedTokens.length} new tokens\n`
            )
          );
        } catch (error) {
          console.error(chalk.red("❌ Failed to clone tokens:"));
          console.error(
            chalk.red(error instanceof Error ? error.message : String(error))
          );
          console.log(
            chalk.yellow(
              "💡 You can start without tokens by removing them from sf.config.json"
            )
          );
          process.exit(1);
        }
      } else if (existingTokens.length > 0) {
        console.log(
          chalk.green("✅ All tokens already cloned, skipping clone step\n")
        );
      }
    }

    // Airdrop SOL to mint authority if tokens were cloned (even when validator already running)
    if (clonedTokens.length > 0) {
      console.log(chalk.yellow("\n💸 Airdropping SOL to mint authority..."));
      const rpcUrl = `http://127.0.0.1:${config.localnet.port}`;

      try {
        await airdropSolToMintAuthority(clonedTokens[0], rpcUrl, debug);
        console.log(chalk.green("✅ SOL airdropped successfully!"));
      } catch (error) {
        console.error(chalk.red("❌ Failed to airdrop SOL:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
        console.log(
          chalk.yellow(
            "💡 You may need to manually airdrop SOL for fee payments"
          )
        );
      }
    }

    // Still mint tokens if any were cloned
    if (clonedTokens.length > 0) {
      console.log(chalk.yellow("\n💰 Minting tokens..."));
      const tokenCloner = new TokenCloner();
      const rpcUrl = `http://127.0.0.1:${config.localnet.port}`;

      if (debug) {
        console.log(
          chalk.gray(`🐛 Minting ${clonedTokens.length} tokens to recipients:`)
        );
        clonedTokens.forEach((token, index) => {
          console.log(
            chalk.gray(
              `  ${index + 1}. ${token.config.symbol} (${
                token.config.mainnetMint
              }) - ${token.config.mintAmount} tokens`
            )
          );
        });
        console.log(chalk.gray(`🌐 Using RPC: ${rpcUrl}`));
      }

      try {
        await tokenCloner.mintTokensToRecipients(clonedTokens, rpcUrl, debug);
        console.log(chalk.green("✅ Token minting completed!"));

        if (debug) {
          console.log(
            chalk.gray(
              "🐛 All tokens have been minted to their respective recipients"
            )
          );
        }
      } catch (error) {
        console.error(chalk.red("❌ Failed to mint tokens:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
        console.log(
          chalk.yellow("💡 Validator is still running, you can mint manually")
        );
      }
    }
    return;
  }

  // Generate unique ID for this validator instance
  const validatorId = generateValidatorId(config.name);

  // Get available ports (only if validator is not already running)
  const ports = await portManager.getRecommendedPorts(config);
  if (
    ports.rpcPort !== config.localnet.port ||
    ports.faucetPort !== config.localnet.faucetPort
  ) {
    console.log(
      chalk.yellow(
        `⚠️  Configured ports not available, using: RPC ${ports.rpcPort}, Faucet ${ports.faucetPort}`
      )
    );
    // Update config with available ports
    config.localnet.port = ports.rpcPort;
    config.localnet.faucetPort = ports.faucetPort;
  }

  console.log(chalk.blue(`🚀 Starting ${config.name} (${validatorId})...\n`));
  console.log(chalk.gray(`📡 RPC Port: ${config.localnet.port}`));
  console.log(chalk.gray(`💰 Faucet Port: ${config.localnet.faucetPort}\n`));

  // Programs will be cloned automatically by validator using --clone-program flags
  if (config.programs.length > 0) {
    console.log(
      chalk.cyan(
        `🔧 Will clone ${config.programs.length} programs from mainnet during startup\n`
      )
    );
  }

  // Clone tokens after programs
  let clonedTokens: ClonedToken[] = [];
  if (config.tokens.length > 0) {
    const tokenCloner = new TokenCloner();

    // Check which tokens are already cloned and which need to be cloned
    const { existingTokens, tokensToClone } = await checkExistingClonedTokens(
      config.tokens,
      tokenCloner
    );

    if (existingTokens.length > 0) {
      console.log(
        chalk.green(`📁 Found ${existingTokens.length} already cloned tokens`)
      );
      if (debug) {
        existingTokens.forEach((token: ClonedToken) => {
          console.log(
            chalk.gray(
              `  ✓ ${token.config.symbol} (${token.config.mainnetMint})`
            )
          );
        });
      }
      clonedTokens.push(...existingTokens);
    }

    if (tokensToClone.length > 0) {
      console.log(
        chalk.yellow(
          `📦 Cloning ${tokensToClone.length} new tokens from mainnet...\n`
        )
      );
      try {
        const newlyClonedTokens = await tokenCloner.cloneTokens(
          tokensToClone,
          config.localnet.rpc,
          debug
        );
        clonedTokens.push(...newlyClonedTokens);
        console.log(
          chalk.green(
            `✅ Successfully cloned ${newlyClonedTokens.length} new tokens\n`
          )
        );
      } catch (error) {
        console.error(chalk.red("❌ Failed to clone tokens:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
        console.log(
          chalk.yellow(
            "💡 You can start without tokens by removing them from sf.config.json"
          )
        );
        process.exit(1);
      }
    } else if (existingTokens.length > 0) {
      console.log(
        chalk.green("✅ All tokens already cloned, skipping clone step\n")
      );
    }
  }

  // Build validator command arguments
  const args = buildValidatorArgs(config, clonedTokens);

  console.log(chalk.gray("Command to run:"));
  console.log(chalk.gray(`solana-test-validator ${args.join(" ")}\n`));

  if (debug) {
    console.log(chalk.yellow("🐛 Debug mode enabled"));
    console.log(chalk.gray("Full command details:"));
    console.log(chalk.gray(`  Command: solana-test-validator`));
    console.log(chalk.gray(`  Arguments: ${JSON.stringify(args, null, 2)}`));
  }

  // Start the validator
  const spinner = ora("Starting Solana test validator...").start();

  try {
    // Start validator in background
    const validatorProcess = await startValidatorInBackground(
      "solana-test-validator",
      args,
      debug
    );

    // Wait for validator to be ready
    spinner.text = "Waiting for validator to be ready...";
    await waitForValidatorReady(
      `http://127.0.0.1:${config.localnet.port}`,
      debug
    );

    // Find an available port for the API server
    let apiServerPort = 3000;
    while (!(await portManager.isPortAvailable(apiServerPort))) {
      apiServerPort++;
      if (apiServerPort > 3100) {
        throw new Error("Could not find available port for API server");
      }
    }

    // Start the API server as a background process
    let apiServerPid: number | undefined;
    let apiResult: { success: boolean; error?: string } = {
      success: false,
      error: "Not started",
    };

    try {
      const currentDir = process.cwd();
      const testpilotDir = join(__dirname, "..", "..");
      const apiServerScript = join(testpilotDir, "src", "api-server-entry.ts");
      const configPath =
        configManager.getConfigPath() ?? join(currentDir, "sf.config.json");
      const workDir = join(currentDir, ".solforge");

      // Start API server in background using runCommand with nohup
      const hostFlag = network ? ` --host "0.0.0.0"` : "";
      const apiServerCommand = `nohup bun run "${apiServerScript}" --port ${apiServerPort} --config "${configPath}" --rpc-url "http://127.0.0.1:${config.localnet.port}" --faucet-url "http://127.0.0.1:${config.localnet.faucetPort}" --work-dir "${workDir}"${hostFlag} > /dev/null 2>&1 &`;

      const startResult = await runCommand("sh", ["-c", apiServerCommand], {
        silent: !debug,
        debug: debug,
      });

      if (startResult.success) {
        // Wait a moment for the API server to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Test if the API server is responding
        try {
          const healthCheckHost = network ? "0.0.0.0" : "127.0.0.1";
          const response = await fetch(
            `http://${healthCheckHost}:${apiServerPort}/api/health`
          );
          if (response.ok) {
            apiResult = { success: true };
            // Get the PID of the API server process
            const pidResult = await runCommand(
              "pgrep",
              ["-f", `api-server-entry.*--port ${apiServerPort}`],
              { silent: true, debug: false }
            );
            if (pidResult.success && pidResult.stdout.trim()) {
              const pidLine = pidResult.stdout.trim().split("\n")[0];
              if (pidLine) {
                apiServerPid = parseInt(pidLine);
              }
            }
          } else {
            apiResult = {
              success: false,
              error: `Health check failed: ${response.status}`,
            };
          }
        } catch (error) {
          apiResult = {
            success: false,
            error: `Health check failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      } else {
        apiResult = {
          success: false,
          error: `Failed to start API server: ${
            startResult.stderr || "Unknown error"
          }`,
        };
      }
    } catch (error) {
      apiResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (!apiResult.success) {
      console.warn(
        chalk.yellow("⚠️  Failed to start API server:", apiResult.error)
      );
    }

    // Register the running validator
    const runningValidator: RunningValidator = {
      id: validatorId,
      name: config.name,
      pid: validatorProcess.pid!,
      rpcPort: config.localnet.port,
      faucetPort: config.localnet.faucetPort,
      rpcUrl: `http://127.0.0.1:${config.localnet.port}`,
      faucetUrl: `http://127.0.0.1:${config.localnet.faucetPort}`,
      configPath: configManager.getConfigPath() || "./sf.config.json",
      startTime: new Date(),
      status: "running",
      apiServerPort: apiResult.success ? apiServerPort : undefined,
      apiServerUrl: apiResult.success
        ? `http://${network ? "0.0.0.0" : "127.0.0.1"}:${apiServerPort}`
        : undefined,
      apiServerPid: apiResult.success ? apiServerPid : undefined,
    };

    processRegistry.register(runningValidator);

    // Validator is now ready
    spinner.succeed("Validator started successfully!");

    console.log(chalk.green("✅ Localnet is running!"));
    console.log(chalk.gray(`🆔 Validator ID: ${validatorId}`));
    console.log(
      chalk.cyan(`🌐 RPC URL: http://127.0.0.1:${config.localnet.port}`)
    );
    console.log(
      chalk.cyan(
        `💰 Faucet URL: http://127.0.0.1:${config.localnet.faucetPort}`
      )
    );
    if (apiResult.success) {
      const displayHost = network ? "0.0.0.0" : "127.0.0.1";
      console.log(
        chalk.cyan(`🚀 API Server: http://${displayHost}:${apiServerPort}/api`)
      );
      if (network) {
        console.log(
          chalk.yellow(
            "   🌐 Network mode enabled - API server accessible from other devices"
          )
        );
      }
    }

    // Airdrop SOL to mint authority if tokens were cloned
    if (clonedTokens.length > 0) {
      console.log(chalk.yellow("\n💸 Airdropping SOL to mint authority..."));
      const rpcUrl = `http://127.0.0.1:${config.localnet.port}`;

      try {
        await airdropSolToMintAuthority(clonedTokens[0], rpcUrl, debug);
        console.log(chalk.green("✅ SOL airdropped successfully!"));
      } catch (error) {
        console.error(chalk.red("❌ Failed to airdrop SOL:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
        console.log(
          chalk.yellow(
            "💡 You may need to manually airdrop SOL for fee payments"
          )
        );
      }
    }

    // Mint tokens if any were cloned
    if (clonedTokens.length > 0) {
      console.log(chalk.yellow("\n💰 Minting tokens..."));
      const tokenCloner = new TokenCloner();
      const rpcUrl = `http://127.0.0.1:${config.localnet.port}`;

      if (debug) {
        console.log(
          chalk.gray(`🐛 Minting ${clonedTokens.length} tokens to recipients:`)
        );
        clonedTokens.forEach((token, index) => {
          console.log(
            chalk.gray(
              `  ${index + 1}. ${token.config.symbol} (${
                token.config.mainnetMint
              }) - ${token.config.mintAmount} tokens`
            )
          );
        });
        console.log(chalk.gray(`🌐 Using RPC: ${rpcUrl}`));
      }

      try {
        await tokenCloner.mintTokensToRecipients(clonedTokens, rpcUrl, debug);
        console.log(chalk.green("✅ Token minting completed!"));

        if (debug) {
          console.log(
            chalk.gray(
              "🐛 All tokens have been minted to their respective recipients"
            )
          );
        }
      } catch (error) {
        console.error(chalk.red("❌ Failed to mint tokens:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error))
        );
        console.log(
          chalk.yellow("💡 Validator is still running, you can mint manually")
        );
      }
    }

    if (config.tokens.length > 0) {
      console.log(chalk.yellow("\n🪙 Cloned tokens:"));
      config.tokens.forEach((token) => {
        console.log(
          chalk.gray(
            `  - ${token.symbol}: ${token.mainnetMint} (${token.mintAmount} minted)`
          )
        );
      });
    }

    if (config.programs.length > 0) {
      console.log(chalk.yellow("\n📦 Cloned programs:"));
      config.programs.forEach((program) => {
        const name =
          program.name || program.mainnetProgramId.slice(0, 8) + "...";
        console.log(chalk.gray(`  - ${name}: ${program.mainnetProgramId}`));
      });
    }

    console.log(chalk.blue("\n💡 Tips:"));
    console.log(
      chalk.gray("  - Run `solforge list` to see all running validators")
    );
    console.log(
      chalk.gray("  - Run `solforge status` to check validator status")
    );
    console.log(
      chalk.gray(
        `  - Run \`solforge stop ${validatorId}\` to stop this validator`
      )
    );
    console.log(
      chalk.gray("  - Run `solforge stop --all` to stop all validators")
    );
    if (apiResult.success) {
      const endpointHost = network ? "0.0.0.0" : "127.0.0.1";
      console.log(chalk.blue("\n🔌 API Endpoints:"));
      console.log(
        chalk.gray(
          `  - GET  http://${endpointHost}:${apiServerPort}/api/tokens - List cloned tokens`
        )
      );
      console.log(
        chalk.gray(
          `  - GET  http://${endpointHost}:${apiServerPort}/api/programs - List cloned programs`
        )
      );
      console.log(
        chalk.gray(
          `  - POST http://${endpointHost}:${apiServerPort}/api/tokens/{mintAddress}/mint - Mint tokens`
        )
      );
      console.log(
        chalk.gray(
          `  - POST http://${endpointHost}:${apiServerPort}/api/airdrop - Airdrop SOL`
        )
      );
      console.log(
        chalk.gray(
          `  - GET  http://${endpointHost}:${apiServerPort}/api/wallet/{address}/balances - Get balances`
        )
      );
    }
  } catch (error) {
    spinner.fail("Failed to start validator");
    console.error(chalk.red("❌ Unexpected error:"));
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
}

function buildValidatorArgs(
  config: Config,
  clonedTokens: ClonedToken[] = []
): string[] {
  const args: string[] = [];

  // Basic configuration
  args.push("--rpc-port", config.localnet.port.toString());
  args.push("--faucet-port", config.localnet.faucetPort.toString());
  args.push("--bind-address", config.localnet.bindAddress);

  if (config.localnet.reset) {
    args.push("--reset");
  }

  if (config.localnet.quiet) {
    args.push("--quiet");
  } else {
    // Always use quiet mode to prevent log spam in background
    args.push("--quiet");
  }

  // Add ledger size limit
  args.push("--limit-ledger-size", config.localnet.limitLedgerSize.toString());

  // Add cloned token accounts (using modified JSON files)
  if (clonedTokens.length > 0) {
    const tokenCloner = new TokenCloner();
    const tokenArgs = tokenCloner.getValidatorArgs(clonedTokens);
    args.push(...tokenArgs);
  }

  // Clone programs from mainnet using built-in validator flags
  for (const program of config.programs) {
    if (program.upgradeable) {
      args.push("--clone-upgradeable-program", program.mainnetProgramId);
    } else {
      // Use --clone for regular programs (non-upgradeable)
      args.push("--clone", program.mainnetProgramId);
    }
  }

  // If we're cloning programs, specify the source cluster
  if (config.programs.length > 0) {
    args.push("--url", config.localnet.rpc);
  }

  return args;
}

/**
 * Start the validator in the background
 */
async function startValidatorInBackground(
  command: string,
  args: string[],
  debug: boolean
): Promise<{ pid: number }> {
  return new Promise((resolve, reject) => {
    if (debug) {
      console.log(chalk.gray(`Starting ${command} in background...`));
      console.log(chalk.gray(`Command: ${command} ${args.join(" ")}`));
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore", // Always ignore stdio to ensure it runs in background
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start validator: ${error.message}`));
    });

    // Give the validator a moment to start
    setTimeout(() => {
      if (child.pid) {
        child.unref(); // Allow parent to exit without waiting for child
        if (debug) {
          console.log(
            chalk.gray(`✅ Validator started with PID: ${child.pid}`)
          );
        }
        resolve({ pid: child.pid });
      } else {
        reject(new Error("Validator failed to start"));
      }
    }, 1000);
  });
}

/**
 * Wait for the validator to be ready by polling the RPC endpoint
 */
async function waitForValidatorReady(
  rpcUrl: string,
  debug: boolean,
  maxAttempts: number = 30
): Promise<void> {
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (debug) {
        console.log(
          chalk.gray(`Attempt ${attempt}/${maxAttempts}: Checking ${rpcUrl}`)
        );
      }

      const result = await runCommand(
        "curl",
        [
          "-s",
          "-X",
          "POST",
          rpcUrl,
          "-H",
          "Content-Type: application/json",
          "-d",
          '{"jsonrpc":"2.0","id":1,"method":"getHealth"}',
        ],
        { silent: true, debug: false }
      );

      if (result.success && result.stdout.includes("ok")) {
        if (debug) {
          console.log(
            chalk.green(`✅ Validator is ready after ${attempt} attempts`)
          );
        }
        return;
      }

      // Store the last error for better diagnostics
      if (!result.success) {
        lastError = result.stderr || "Unknown error";
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }

  // Provide better error message
  let errorMsg = `Validator failed to become ready after ${maxAttempts} attempts`;
  if (lastError.includes("Connection refused")) {
    errorMsg += `\n💡 This usually means:\n  - Port ${
      rpcUrl.split(":")[2]
    } is already in use\n  - Run 'pkill -f solana-test-validator' to kill existing validators`;
  } else if (lastError) {
    errorMsg += `\nLast error: ${lastError}`;
  }

  throw new Error(errorMsg);
}

/**
 * Airdrop SOL to the mint authority for fee payments
 */
async function airdropSolToMintAuthority(
  clonedToken: any,
  rpcUrl: string,
  debug: boolean = false
): Promise<void> {
  if (debug) {
    console.log(
      chalk.gray(`Airdropping 10 SOL to ${clonedToken.mintAuthority.publicKey}`)
    );
  }

  const airdropResult = await runCommand(
    "solana",
    ["airdrop", "10", clonedToken.mintAuthority.publicKey, "--url", rpcUrl],
    { silent: !debug, debug }
  );

  if (!airdropResult.success) {
    throw new Error(
      `Failed to airdrop SOL: ${airdropResult.stderr || airdropResult.stdout}`
    );
  }

  if (debug) {
    console.log(chalk.gray("SOL airdrop completed"));
  }
}

/**
 * Check for existing cloned tokens and return what's already cloned vs what needs to be cloned
 */
async function checkExistingClonedTokens(
  tokens: TokenConfig[],
  tokenCloner: TokenCloner
): Promise<{ existingTokens: ClonedToken[]; tokensToClone: TokenConfig[] }> {
  const existingTokens: ClonedToken[] = [];
  const tokensToClone: TokenConfig[] = [];
  const workDir = ".solforge";

  // Check for shared mint authority
  const sharedMintAuthorityPath = join(workDir, "shared-mint-authority.json");
  let sharedMintAuthority: { publicKey: string; secretKey: number[] } | null =
    null;

  if (existsSync(sharedMintAuthorityPath)) {
    try {
      const fileContent = JSON.parse(
        readFileSync(sharedMintAuthorityPath, "utf8")
      );

      if (Array.isArray(fileContent)) {
        // New format: file contains just the secret key array
        const { Keypair } = await import("@solana/web3.js");
        const keypair = Keypair.fromSecretKey(new Uint8Array(fileContent));
        sharedMintAuthority = {
          publicKey: keypair.publicKey.toBase58(),
          secretKey: Array.from(keypair.secretKey),
        };

        // Check metadata for consistency
        const metadataPath = join(workDir, "shared-mint-authority-meta.json");
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
          if (metadata.publicKey !== sharedMintAuthority.publicKey) {
            sharedMintAuthority.publicKey = metadata.publicKey;
          }
        }
      } else {
        // Old format: file contains {publicKey, secretKey}
        sharedMintAuthority = fileContent;
      }
    } catch (error) {
      // If we can't read the shared mint authority, treat all tokens as needing to be cloned
      sharedMintAuthority = null;
    }
  }

  for (const token of tokens) {
    const tokenDir = join(workDir, `token-${token.symbol.toLowerCase()}`);
    const modifiedAccountPath = join(tokenDir, "modified.json");

    // Check if this token has already been cloned
    if (existsSync(modifiedAccountPath) && sharedMintAuthority) {
      // Token appears to be already cloned
      existingTokens.push({
        config: token,
        mintAuthorityPath: sharedMintAuthorityPath,
        modifiedAccountPath,
        mintAuthority: sharedMintAuthority,
      });
    } else {
      // Token needs to be cloned
      tokensToClone.push(token);
    }
  }

  return { existingTokens, tokensToClone };
}
