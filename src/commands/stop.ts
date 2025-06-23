import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { processRegistry } from "../services/process-registry.js";
import type { RunningValidator } from "../services/process-registry.js";

export async function stopCommand(
  validatorId?: string,
  options: { all?: boolean; kill?: boolean } = {}
): Promise<void> {
  console.log(chalk.blue("🛑 Stopping validator(s)...\n"));

  // Clean up dead processes first
  await processRegistry.cleanup();

  const validators = processRegistry.getRunning();

  if (validators.length === 0) {
    console.log(chalk.yellow("⚠️  No running validators found"));
    return;
  }

  let validatorsToStop: RunningValidator[] = [];

  if (options.all) {
    // Stop all validators
    validatorsToStop = validators;
    console.log(
      chalk.cyan(`🔄 Stopping all ${validators.length} validator(s)...`)
    );
  } else if (validatorId) {
    // Stop specific validator
    const validator = processRegistry.getById(validatorId);
    if (!validator) {
      console.error(
        chalk.red(`❌ Validator with ID '${validatorId}' not found`)
      );
      console.log(
        chalk.gray("💡 Use `solforge list` to see running validators")
      );
      return;
    }
    validatorsToStop = [validator];
    console.log(
      chalk.cyan(
        `🔄 Stopping validator '${validator.name}' (${validatorId})...`
      )
    );
  } else {
    // No specific validator specified, show available options
    console.log(chalk.yellow("⚠️  Please specify which validator to stop:"));
    console.log(
      chalk.gray("💡 Use `solforge stop <id>` to stop a specific validator")
    );
    console.log(
      chalk.gray("💡 Use `solforge stop --all` to stop all validators")
    );
    console.log(
      chalk.gray("💡 Use `solforge list` to see running validators")
    );
    return;
  }

  // Stop each validator
  let stoppedCount = 0;
  let errorCount = 0;

  for (const validator of validatorsToStop) {
    try {
      const result = await stopValidator(validator, options.kill);
      if (result.success) {
        console.log(
          chalk.green(`✅ Stopped ${validator.name} (${validator.id})`)
        );
        stoppedCount++;
      } else {
        console.error(
          chalk.red(
            `❌ Failed to stop ${validator.name} (${validator.id}): ${result.error}`
          )
        );
        errorCount++;
      }
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Error stopping ${validator.name} (${validator.id}): ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      errorCount++;
    }
  }

  // Summary
  console.log();
  if (stoppedCount > 0) {
    console.log(
      chalk.green(`✅ Successfully stopped ${stoppedCount} validator(s)`)
    );
  }
  if (errorCount > 0) {
    console.log(chalk.red(`❌ Failed to stop ${errorCount} validator(s)`));
  }
}

async function stopValidator(
  validator: RunningValidator,
  forceKill: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if process is still running
    const isRunning = await processRegistry.isProcessRunning(validator.pid);
    if (!isRunning) {
      // Process already stopped, just clean up registry
      processRegistry.unregister(validator.id);
      return { success: true };
    }

    const signal = forceKill ? "SIGKILL" : "SIGTERM";

    // Send termination signal
    process.kill(validator.pid, signal);

    if (forceKill) {
      // For SIGKILL, process should stop immediately
      processRegistry.unregister(validator.id);
      return { success: true };
    } else {
      // For SIGTERM, wait for graceful shutdown
      const shutdownResult = await waitForProcessShutdown(validator.pid, 10000);

      if (shutdownResult.success) {
        processRegistry.unregister(validator.id);
        return { success: true };
      } else {
        // Graceful shutdown failed, try force kill
        console.log(
          chalk.yellow(
            `⚠️  Graceful shutdown failed for ${validator.name}, force killing...`
          )
        );
        process.kill(validator.pid, "SIGKILL");
        processRegistry.unregister(validator.id);
        return { success: true };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If error is "ESRCH" (No such process), the process is already gone
    if (errorMessage.includes("ESRCH")) {
      processRegistry.unregister(validator.id);
      return { success: true };
    }

    return { success: false, error: errorMessage };
  }
}

async function waitForProcessShutdown(
  pid: number,
  timeoutMs: number = 10000
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      // If no error thrown, process is still running
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      // Process is gone
      return { success: true };
    }
  }

  return { success: false, error: "Process shutdown timeout" };
}

export async function killCommand(
  validatorId?: string,
  options: { all?: boolean } = {}
): Promise<void> {
  console.log(chalk.red("💀 Force killing validator(s)...\n"));

  // Clean up dead processes first
  await processRegistry.cleanup();

  const validators = processRegistry.getRunning();

  if (validators.length === 0) {
    console.log(chalk.yellow("⚠️  No running validators found"));
    return;
  }

  let validatorsToKill: RunningValidator[] = [];

  if (options.all) {
    // Kill all validators
    validatorsToKill = validators;
    console.log(
      chalk.cyan(`🔄 Force killing all ${validators.length} validator(s)...`)
    );
  } else if (validatorId) {
    // Kill specific validator
    const validator = processRegistry.getById(validatorId);
    if (!validator) {
      console.error(
        chalk.red(`❌ Validator with ID '${validatorId}' not found`)
      );
      console.log(
        chalk.gray("💡 Use `solforge list` to see running validators")
      );
      return;
    }
    validatorsToKill = [validator];
    console.log(
      chalk.cyan(
        `🔄 Force killing validator '${validator.name}' (${validatorId})...`
      )
    );
  } else {
    // No specific validator specified, show interactive selection
    console.log(chalk.cyan("📋 Select validator(s) to force kill:\n"));

    // Display current validators
    displayValidatorsTable(validators);

    const choices = [
      ...validators.map((v) => ({
        name: `${v.name} (${v.id}) - PID: ${v.pid}`,
        value: v.id,
      })),
      {
        name: chalk.red("Kill ALL validators"),
        value: "all",
      },
      {
        name: chalk.gray("Cancel"),
        value: "cancel",
      },
    ];

    const selectedValidator = await select({
      message: "Which validator would you like to force kill?",
      choices,
    });

    if (selectedValidator === "cancel") {
      console.log(chalk.gray("Operation cancelled"));
      return;
    }

    if (selectedValidator === "all") {
      validatorsToKill = validators;
      console.log(
        chalk.cyan(`🔄 Force killing all ${validators.length} validator(s)...`)
      );
    } else {
      const validator = processRegistry.getById(selectedValidator);
      if (!validator) {
        console.error(chalk.red("❌ Selected validator not found"));
        return;
      }
      validatorsToKill = [validator];
      console.log(
        chalk.cyan(
          `🔄 Force killing validator '${validator.name}' (${selectedValidator})...`
        )
      );
    }
  }

  // Kill each validator
  let killedCount = 0;
  let errorCount = 0;

  for (const validator of validatorsToKill) {
    try {
      const result = await stopValidator(validator, true); // Force kill
      if (result.success) {
        console.log(
          chalk.green(`✅ Killed ${validator.name} (${validator.id})`)
        );
        killedCount++;
      } else {
        console.error(
          chalk.red(
            `❌ Failed to kill ${validator.name} (${validator.id}): ${result.error}`
          )
        );
        errorCount++;
      }
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Error killing ${validator.name} (${validator.id}): ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      errorCount++;
    }
  }

  // Summary
  console.log();
  if (killedCount > 0) {
    console.log(
      chalk.green(`✅ Successfully killed ${killedCount} validator(s)`)
    );
  }
  if (errorCount > 0) {
    console.log(chalk.red(`❌ Failed to kill ${errorCount} validator(s)`));
  }
}

function displayValidatorsTable(validators: RunningValidator[]): void {
  // Calculate column widths
  const maxIdWidth = Math.max(2, ...validators.map((v) => v.id.length));
  const maxNameWidth = Math.max(4, ...validators.map((v) => v.name.length));
  const maxPidWidth = Math.max(
    3,
    ...validators.map((v) => v.pid.toString().length)
  );
  const maxPortWidth = 9; // "8899/9900" format
  const maxUptimeWidth = 7;

  // Header
  const header =
    chalk.bold("ID".padEnd(maxIdWidth)) +
    " | " +
    chalk.bold("Name".padEnd(maxNameWidth)) +
    " | " +
    chalk.bold("PID".padEnd(maxPidWidth)) +
    " | " +
    chalk.bold("RPC/Faucet".padEnd(maxPortWidth)) +
    " | " +
    chalk.bold("Uptime".padEnd(maxUptimeWidth)) +
    " | " +
    chalk.bold("Status");

  console.log(header);
  console.log("-".repeat(header.length - 20)); // Subtract ANSI codes length

  // Rows
  validators.forEach((validator) => {
    const uptime = formatUptime(validator.startTime);
    const ports = `${validator.rpcPort}/${validator.faucetPort}`;
    const status =
      validator.status === "running" ? chalk.green("●") : chalk.red("●");

    const row =
      validator.id.padEnd(maxIdWidth) +
      " | " +
      validator.name.padEnd(maxNameWidth) +
      " | " +
      validator.pid.toString().padEnd(maxPidWidth) +
      " | " +
      ports.padEnd(maxPortWidth) +
      " | " +
      uptime.padEnd(maxUptimeWidth) +
      " | " +
      status;

    console.log(row);
  });

  console.log(); // Empty line
}

function formatUptime(startTime: Date): string {
  const now = new Date();
  const uptimeMs = now.getTime() - startTime.getTime();
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  if (uptimeSeconds < 60) {
    return `${uptimeSeconds}s`;
  } else if (uptimeSeconds < 3600) {
    const minutes = Math.floor(uptimeSeconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    return `${hours}h${minutes}m`;
  }
}
