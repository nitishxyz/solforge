import { type ChildProcess, spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import type {
	LocalnetConfig,
	OperationResult,
	ValidatorState,
	ValidatorStatus,
} from "../types/config.js";

export class ValidatorService {
	private process: ChildProcess | null = null;
	private state: ValidatorState;
	private config: LocalnetConfig;

	constructor(config: LocalnetConfig) {
		this.config = config;
		this.state = {
			status: "stopped",
			port: config.port,
			faucetPort: config.faucetPort,
			rpcUrl: `http://${config.bindAddress}:${config.port}`,
			wsUrl: `ws://${config.bindAddress}:${config.port}`,
			logs: [],
		};
	}

	/**
	 * Start the validator with the given configuration
	 */
	async start(
		programs: string[] = [],
		tokens: string[] = [],
	): Promise<OperationResult<ValidatorState>> {
		if (this.state.status === "running") {
			return {
				success: false,
				error: "Validator is already running",
				data: this.state,
			};
		}

		try {
			this.updateStatus("starting");

			const args = this.buildValidatorArgs(programs, tokens);

			this.process = spawn("solana-test-validator", args, {
				stdio: ["pipe", "pipe", "pipe"],
				detached: false,
			});

			this.state.pid = this.process.pid;
			this.state.startTime = new Date();

			// Handle process events
			this.setupProcessHandlers();

			// Wait for validator to be ready
			await this.waitForReady();

			this.updateStatus("running");

			return {
				success: true,
				data: this.state,
			};
		} catch (error) {
			this.updateStatus("error");
			this.state.error = error instanceof Error ? error.message : String(error);

			return {
				success: false,
				error: this.state.error,
				data: this.state,
			};
		}
	}

	/**
	 * Stop the validator
	 */
	async stop(): Promise<OperationResult<ValidatorState>> {
		if (this.state.status === "stopped") {
			return {
				success: true,
				data: this.state,
			};
		}

		try {
			this.updateStatus("stopping");

			if (this.process) {
				this.process.kill("SIGTERM");

				// Wait for graceful shutdown
				await new Promise<void>((resolve) => {
					const timeout = setTimeout(() => {
						if (this.process) {
							this.process.kill("SIGKILL");
						}
						resolve();
					}, 5000);

					this.process?.on("exit", () => {
						clearTimeout(timeout);
						resolve();
					});
				});
			}

			this.cleanup();
			this.updateStatus("stopped");

			return {
				success: true,
				data: this.state,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				data: this.state,
			};
		}
	}

	/**
	 * Get current validator state
	 */
	getState(): ValidatorState {
		return { ...this.state };
	}

	/**
	 * Check if validator is running
	 */
	isRunning(): boolean {
		return this.state.status === "running";
	}

	/**
	 * Get recent logs
	 */
	getLogs(count = 100): string[] {
		return this.state.logs.slice(-count);
	}

	/**
	 * Build validator arguments based on configuration
	 */
	private buildValidatorArgs(
		programs: string[] = [],
		tokens: string[] = [],
	): string[] {
		const args: string[] = [];

		// Basic configuration
		args.push("--rpc-port", this.config.port.toString());
		args.push("--faucet-port", this.config.faucetPort.toString());
		args.push("--bind-address", this.config.bindAddress);

		if (this.config.reset) {
			args.push("--reset");
		}

		if (this.config.quiet) {
			args.push("--quiet");
		}

		if (this.config.ledgerPath) {
			args.push("--ledger", this.config.ledgerPath);
		}

		// Set log level
		args.push("--log");

		// Clone programs
		for (const programId of programs) {
			args.push("--clone", programId);
		}

		// Clone tokens (these would be mint addresses)
		for (const tokenMint of tokens) {
			args.push("--clone", tokenMint);
		}

		// Always specify mainnet as the source for cloning
		if (programs.length > 0 || tokens.length > 0) {
			args.push("--url", "https://api.mainnet-beta.solana.com");
		}

		return args;
	}

	/**
	 * Setup process event handlers
	 */
	private setupProcessHandlers(): void {
		if (!this.process) return;

		this.process.stdout?.on("data", (data: Buffer) => {
			const log = data.toString().trim();
			this.addLog(`[STDOUT] ${log}`);
		});

		this.process.stderr?.on("data", (data: Buffer) => {
			const log = data.toString().trim();
			this.addLog(`[STDERR] ${log}`);
		});

		this.process.on("error", (error) => {
			this.addLog(`[ERROR] ${error.message}`);
			this.updateStatus("error");
			this.state.error = error.message;
		});

		this.process.on("exit", (code, signal) => {
			this.addLog(`[EXIT] Process exited with code ${code}, signal ${signal}`);
			this.cleanup();

			if (this.state.status !== "stopping") {
				this.updateStatus(code === 0 ? "stopped" : "error");
				if (code !== 0) {
					this.state.error = `Process exited with code ${code}`;
				}
			}
		});
	}

	/**
	 * Wait for validator to be ready
	 */
	private async waitForReady(timeout = 30000): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			try {
				// Try to connect to the RPC endpoint
				const response = await fetch(this.state.rpcUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "getHealth",
					}),
				});

				if (response.ok) {
					return; // Validator is ready
				}
			} catch (error) {
				// Continue waiting
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		throw new Error("Validator failed to start within timeout period");
	}

	/**
	 * Update validator status
	 */
	private updateStatus(status: ValidatorStatus): void {
		this.state.status = status;
		this.addLog(`[STATUS] Validator status changed to: ${status}`);
	}

	/**
	 * Add log entry
	 */
	private addLog(message: string): void {
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}] ${message}`;
		this.state.logs.push(logEntry);

		// Keep only last 1000 log entries
		if (this.state.logs.length > 1000) {
			this.state.logs = this.state.logs.slice(-1000);
		}
	}

	/**
	 * Clean up process references
	 */
	private cleanup(): void {
		this.process = null;
		this.state.pid = undefined;
		this.state.startTime = undefined;
		this.state.error = undefined;
	}
}
