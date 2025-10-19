import { z } from "zod";

export const TokenConfigSchema = z.object({
	symbol: z.string().min(1, "Token symbol is required"),
	mainnetMint: z.string().min(1, "Mainnet mint address is required"),
	mintAuthority: z.string().optional(),
	mintAmount: z
		.number()
		.positive("Mint amount must be positive")
		.default(1000000),
	recipients: z
		.array(
			z.object({
				wallet: z.string().min(1, "Wallet address is required"),
				amount: z.number().positive("Amount must be positive"),
			}),
		)
		.default([]),
	cloneMetadata: z.boolean().default(true),
});

export const ProgramConfigSchema = z.object({
	name: z.string().optional(),
	mainnetProgramId: z.string().min(1, "Program ID is required"),
	deployPath: z.string().optional(),
	upgradeable: z.boolean().default(false),
	cluster: z
		.enum(["mainnet-beta", "devnet", "testnet"])
		.default("mainnet-beta"),
	dependencies: z.array(z.string()).default([]),
});

export const AgiConfigSchema = z.object({
	enabled: z.boolean().default(true),
	port: z.number().int().min(1000).max(65535).default(3456),
	host: z.string().default("127.0.0.1"),
	provider: z.enum(["openrouter", "anthropic", "openai"]).optional(),
	model: z.string().optional(),
	apiKey: z.string().optional(),
	agent: z.enum(["general", "build"]).optional().default("general"),
});

export const LocalnetConfigSchema = z.object({
	airdropAmount: z.number().positive().default(100),
	faucetAccounts: z.array(z.string()).default([]),
	logLevel: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
	port: z.number().int().min(1000).max(65535).default(8899),
	faucetPort: z.number().int().min(1000).max(65535).default(9900),
	reset: z.boolean().default(false),
	quiet: z.boolean().default(false),
	ledgerPath: z.string().optional(),
	bindAddress: z.string().default("127.0.0.1"),
	limitLedgerSize: z.number().int().positive().default(100000),
	rpc: z
		.string()
		.url("RPC must be a valid URL")
		.default("https://api.mainnet-beta.solana.com"),
});

export const ConfigSchema = z.object({
	name: z.string().default("solforge-localnet"),
	description: z.string().optional(),
	tokens: z.array(TokenConfigSchema).default([]),
	programs: z.array(ProgramConfigSchema).default([]),
	localnet: LocalnetConfigSchema.default({}),
	agi: AgiConfigSchema.default({}),
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;
export type ProgramConfig = z.infer<typeof ProgramConfigSchema>;
export type AgiConfig = z.infer<typeof AgiConfigSchema>;
export type LocalnetConfig = z.infer<typeof LocalnetConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export type ValidatorStatus =
	| "stopped"
	| "starting"
	| "running"
	| "stopping"
	| "error";

export interface ValidatorState {
	status: ValidatorStatus;
	pid?: number;
	port: number;
	faucetPort: number;
	rpcUrl: string;
	wsUrl: string;
	startTime?: Date;
	logs: string[];
	error?: string;
}

export interface OperationResult<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	details?: unknown;
}

export interface CloneResult {
	type: "program" | "token";
	id: string;
	name?: string;
	success: boolean;
	error?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: Array<{
		path: string;
		message: string;
	}>;
}
