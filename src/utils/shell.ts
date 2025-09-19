import { $ } from "bun";
import chalk from "chalk";

export interface CommandResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Execute a shell command and return the result
 */
export async function runCommand(
	command: string,
	args: string[] = [],
	options: {
		silent?: boolean;
		jsonOutput?: boolean;
		debug?: boolean;
	} = {},
): Promise<CommandResult> {
	const { silent = false, jsonOutput = false, debug = false } = options;

	try {
		if (!silent || debug) {
			console.log(chalk.gray(`$ ${command} ${args.join(" ")}`));
		}

		const result = await $`${command} ${args}`.quiet();

		const stdout = result.stdout.toString();
		const stderr = result.stderr.toString();
		const exitCode = result.exitCode;
		const success = exitCode === 0;

		if (debug) {
			console.log(chalk.gray(`Exit code: ${exitCode}`));
			if (stdout) {
				console.log(chalk.gray(`Stdout: ${stdout}`));
			}
			if (stderr) {
				console.log(chalk.gray(`Stderr: ${stderr}`));
			}
		}

		if (!silent && !success) {
			console.error(chalk.red(`Command failed with exit code ${exitCode}`));
			if (stderr) {
				console.error(chalk.red(`Error: ${stderr}`));
			}
		}

		// If JSON output is expected, try to parse it
		let parsedOutput = stdout;
		if (jsonOutput && success && stdout.trim()) {
			try {
				parsedOutput = JSON.parse(stdout);
			} catch (_e) {
				// If JSON parsing fails, keep original stdout
				console.warn(
					chalk.yellow("Warning: Expected JSON output but got invalid JSON"),
				);
			}
		}

		return {
			success,
			stdout: parsedOutput,
			stderr,
			exitCode,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (!silent) {
			console.error(chalk.red(`Command execution failed: ${errorMessage}`));
		}

		return {
			success: false,
			stdout: "",
			stderr: errorMessage,
			exitCode: 1,
		};
	}
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
	const result = await runCommand("which", [command], { silent: true });
	return result.success;
}

/**
 * Check if solana CLI tools are available
 */
export async function checkSolanaTools(): Promise<{
	solana: boolean;
	splToken: boolean;
}> {
	const [solana, splToken] = await Promise.all([
		commandExists("solana"),
		commandExists("spl-token"),
	]);

	return { solana, splToken };
}
