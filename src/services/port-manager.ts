import { processRegistry } from "./process-registry.js";

export interface PortAllocation {
	rpcPort: number;
	faucetPort: number;
}

export class PortManager {
	private readonly defaultRpcPort = 8899;
	private readonly portRangeStart = 8000;
	private readonly portRangeEnd = 9999;

	/**
	 * Get the next available port pair (RPC + Faucet)
	 */
	async getAvailablePorts(preferredRpcPort?: number): Promise<PortAllocation> {
		const usedPorts = this.getUsedPorts();

		// If preferred port is specified and available, use it
		if (preferredRpcPort && !this.isPortUsed(preferredRpcPort, usedPorts)) {
			const faucetPort = this.findAvailableFaucetPort(
				preferredRpcPort,
				usedPorts,
			);
			if (faucetPort) {
				return { rpcPort: preferredRpcPort, faucetPort };
			}
		}

		// Otherwise, find the next available ports
		return this.findNextAvailablePorts(usedPorts);
	}

	/**
	 * Check if a specific port is available
	 */
	async isPortAvailable(port: number): Promise<boolean> {
		const usedPorts = this.getUsedPorts();
		return (
			!this.isPortUsed(port, usedPorts) &&
			(await this.checkPortActuallyFree(port))
		);
	}

	/**
	 * Get all currently used ports from running validators
	 */
	private getUsedPorts(): Set<number> {
		const validators = processRegistry.getRunning();
		const usedPorts = new Set<number>();

		validators.forEach((validator) => {
			usedPorts.add(validator.rpcPort);
			usedPorts.add(validator.faucetPort);
		});

		return usedPorts;
	}

	/**
	 * Check if a port is in the used ports set
	 */
	private isPortUsed(port: number, usedPorts: Set<number>): boolean {
		return usedPorts.has(port);
	}

	/**
	 * Find an available faucet port for a given RPC port
	 */
	private findAvailableFaucetPort(
		rpcPort: number,
		usedPorts: Set<number>,
	): number | null {
		// Try default offset first (faucet = rpc + 1001)
		let faucetPort = rpcPort + 1001;
		if (
			!this.isPortUsed(faucetPort, usedPorts) &&
			this.isPortInRange(faucetPort)
		) {
			return faucetPort;
		}

		// Try other offsets
		const offsets = [1000, 1002, 1003, 1004, 1005, 999, 998, 997];
		for (const offset of offsets) {
			faucetPort = rpcPort + offset;
			if (
				!this.isPortUsed(faucetPort, usedPorts) &&
				this.isPortInRange(faucetPort)
			) {
				return faucetPort;
			}
		}

		// Search in the entire range
		for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
			if (!this.isPortUsed(port, usedPorts)) {
				return port;
			}
		}

		return null;
	}

	/**
	 * Find the next available port pair
	 */
	private findNextAvailablePorts(usedPorts: Set<number>): PortAllocation {
		// Start from default ports if available
		if (!this.isPortUsed(this.defaultRpcPort, usedPorts)) {
			const faucetPort = this.findAvailableFaucetPort(
				this.defaultRpcPort,
				usedPorts,
			);
			if (faucetPort) {
				return { rpcPort: this.defaultRpcPort, faucetPort };
			}
		}

		// Search for available RPC port
		for (
			let rpcPort = this.portRangeStart;
			rpcPort <= this.portRangeEnd;
			rpcPort++
		) {
			if (!this.isPortUsed(rpcPort, usedPorts)) {
				const faucetPort = this.findAvailableFaucetPort(rpcPort, usedPorts);
				if (faucetPort) {
					return { rpcPort, faucetPort };
				}
			}
		}

		throw new Error("No available port pairs found in the specified range");
	}

	/**
	 * Check if port is within allowed range
	 */
	private isPortInRange(port: number): boolean {
		return port >= this.portRangeStart && port <= this.portRangeEnd;
	}

	/**
	 * Actually check if a port is free by attempting to bind to it
	 */
	private async checkPortActuallyFree(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const net = require("node:net");
			const server = net.createServer();

			server.once("listening", () => {
				server.once("close", () => resolve(true));
				server.close();
			});

			server.once("error", () => resolve(false));

			server.listen(port);
		});
	}

	/**
	 * Get recommended ports for a configuration
	 */
	async getRecommendedPorts(config: {
		localnet: { port: number; faucetPort: number };
	}): Promise<PortAllocation> {
		return this.getAvailablePorts(config.localnet.port);
	}
}

// Singleton instance
export const portManager = new PortManager();
