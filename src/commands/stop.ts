import chalk from "chalk";
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
        chalk.gray("💡 Use `testpilot list` to see running validators")
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
      chalk.gray("💡 Use `testpilot stop <id>` to stop a specific validator")
    );
    console.log(
      chalk.gray("💡 Use `testpilot stop --all` to stop all validators")
    );
    console.log(
      chalk.gray("💡 Use `testpilot list` to see running validators")
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

  // Use stop command with kill option
  await stopCommand(validatorId, { ...options, kill: true });
}
