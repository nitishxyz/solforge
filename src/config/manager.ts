import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { Config, ValidationResult } from "../types/config.js";
import { ConfigSchema } from "../types/config.js";

export class ConfigManager {
	private config: Config | null = null;
	private configPath: string | null = null;

	/**
	 * Load configuration from a file path
	 */
	async load(configPath: string): Promise<Config> {
		try {
			const fullPath = resolve(configPath);

			if (!existsSync(fullPath)) {
				throw new Error(`Configuration file not found: ${fullPath}`);
			}

			const configContent = readFileSync(fullPath, "utf-8");
			const rawConfig = JSON.parse(configContent);

			// Validate and parse with Zod
			const result = ConfigSchema.safeParse(rawConfig);

			if (!result.success) {
				const errors = result.error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				}));
				throw new Error(
					`Configuration validation failed:\n${errors
						.map((e) => `  - ${e.path}: ${e.message}`)
						.join("\n")}`,
				);
			}

			this.config = result.data;
			this.configPath = fullPath;

			return this.config;
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON in configuration file: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Save current configuration to file
	 */
	async save(configPath?: string): Promise<void> {
		if (!this.config) {
			throw new Error("No configuration loaded");
		}

		const targetPath = configPath || this.configPath;
		if (!targetPath) {
			throw new Error("No configuration path specified");
		}

		try {
			const configContent = JSON.stringify(this.config, null, 2);
			writeFileSync(targetPath, configContent, "utf-8");
			this.configPath = targetPath;
		} catch (error) {
			throw new Error(
				`Failed to save configuration: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	/**
	 * Validate a configuration object
	 */
	validate(config: any): ValidationResult {
		const result = ConfigSchema.safeParse(config);

		if (result.success) {
			return { valid: true, errors: [] };
		}

		const errors = result.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		}));

		return { valid: false, errors };
	}

	/**
	 * Create a default configuration
	 */
	createDefault(): Config {
		const defaultConfig = ConfigSchema.parse({});
		this.config = defaultConfig;
		return defaultConfig;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): Config {
		if (!this.config) {
			throw new Error("No configuration loaded. Call load() first.");
		}
		return this.config;
	}

	/**
	 * Update configuration
	 */
	updateConfig(updates: Partial<Config>): Config {
		if (!this.config) {
			throw new Error("No configuration loaded. Call load() first.");
		}

		const updated = { ...this.config, ...updates };
		const result = ConfigSchema.safeParse(updated);

		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			}));
			throw new Error(
				`Configuration update validation failed:\n${errors
					.map((e) => `  - ${e.path}: ${e.message}`)
					.join("\n")}`,
			);
		}

		this.config = result.data;
		return this.config;
	}

	/**
	 * Get configuration file path
	 */
	getConfigPath(): string | null {
		return this.configPath;
	}

	/**
	 * Check if configuration is loaded
	 */
	isLoaded(): boolean {
		return this.config !== null;
	}
}

// Singleton instance
export const configManager = new ConfigManager();
