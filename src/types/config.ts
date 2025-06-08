import { z } from "zod";

// Token configuration schema
export const TokenConfigSchema = z.object({
  symbol: z.string().min(1, "Token symbol is required"),
  mainnetMint: z.string().min(1, "Mainnet mint address is required"),
  mintAuthority: z.string().optional(), // Path to keypair file
  mintAmount: z
    .number()
    .positive("Mint amount must be positive")
    .default(1000000), // Amount to mint to mint authority
  recipients: z
    .array(
      z.object({
        wallet: z.string().min(1, "Wallet address is required"),
        amount: z.number().positive("Amount must be positive"),
      })
    )
    .default([]),
});

// Program configuration schema
export const ProgramConfigSchema = z.object({
  name: z.string().optional(),
  mainnetProgramId: z.string().min(1, "Program ID is required"),
  deployPath: z.string().optional(), // Optional path to local .so file
  upgradeable: z.boolean().default(false),
  cluster: z
    .enum(["mainnet-beta", "devnet", "testnet"])
    .default("mainnet-beta"),
});

// Localnet configuration schema
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

// Complete configuration schema
export const ConfigSchema = z.object({
  name: z.string().default("testpilot-localnet"),
  description: z.string().optional(),
  tokens: z.array(TokenConfigSchema).default([]),
  programs: z.array(ProgramConfigSchema).default([]),
  localnet: LocalnetConfigSchema.default({}),
});

// Inferred TypeScript types
export type TokenConfig = z.infer<typeof TokenConfigSchema>;
export type ProgramConfig = z.infer<typeof ProgramConfigSchema>;
export type LocalnetConfig = z.infer<typeof LocalnetConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Validator status types
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

// Operation result types
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
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
