import chalk from "chalk";
import { processRegistry } from "../services/process-registry.js";
import type { RunningValidator } from "../services/process-registry.js";

export async function listCommand(): Promise<void> {
  console.log(chalk.blue("📋 Listing running validators...\n"));

  // Clean up dead processes first
  await processRegistry.cleanup();

  const validators = processRegistry.getRunning();

  if (validators.length === 0) {
    console.log(chalk.yellow("⚠️  No running validators found"));
    console.log(chalk.gray("💡 Use `testpilot start` to start a validator"));
    return;
  }

  // Verify each validator is actually still running
  const activeValidators: RunningValidator[] = [];
  for (const validator of validators) {
    const isRunning = await processRegistry.isProcessRunning(validator.pid);
    if (isRunning) {
      activeValidators.push({ ...validator, status: "running" });
    } else {
      processRegistry.updateStatus(validator.id, "stopped");
    }
  }

  if (activeValidators.length === 0) {
    console.log(
      chalk.yellow(
        "⚠️  No active validators found (all processes have stopped)"
      )
    );
    console.log(chalk.gray("💡 Use `testpilot start` to start a validator"));
    return;
  }

  console.log(
    chalk.green(
      `✅ Found ${activeValidators.length} running validator${
        activeValidators.length > 1 ? "s" : ""
      }\n`
    )
  );

  // Display validators in a table format
  displayValidatorsTable(activeValidators);

  console.log(
    chalk.gray("\n💡 Use `testpilot stop <id>` to stop a specific validator")
  );
  console.log(
    chalk.gray("💡 Use `testpilot stop --all` to stop all validators")
  );
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

  // URLs section
  console.log(chalk.cyan("🌐 Connection URLs:"));
  validators.forEach((validator) => {
    console.log(chalk.gray(`  ${validator.name} (${validator.id}):`));
    console.log(chalk.gray(`    RPC:    ${validator.rpcUrl}`));
    console.log(chalk.gray(`    Faucet: ${validator.faucetUrl}`));
  });
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
