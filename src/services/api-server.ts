import express from "express";
import cors from "cors";
import { Server } from "http";
import { spawn, ChildProcess } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { runCommand } from "../utils/shell.js";
import { TokenCloner } from "./token-cloner.js";
import { ProgramCloner } from "./program-cloner.js";
import { mintTokenToWallet as mintTokenToWalletShared } from "../commands/mint.js";
import type { Config } from "../types/config.js";
import type { ClonedToken } from "./token-cloner.js";

export interface APIServerConfig {
  port: number;
  host?: string;
  validatorRpcUrl: string;
  validatorFaucetUrl: string;
  config: Config;
  workDir: string;
}

export class APIServer {
  private app: express.Application;
  private server: Server | null = null;
  private config: APIServerConfig;
  private tokenCloner: TokenCloner;
  private programCloner: ProgramCloner;
  private connection: Connection;

  constructor(config: APIServerConfig) {
    this.config = config;
    this.tokenCloner = new TokenCloner(config.workDir);
    this.programCloner = new ProgramCloner(config.workDir);
    this.connection = new Connection(config.validatorRpcUrl, "confirmed");

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(chalk.gray(`🌐 API: ${req.method} ${req.path}`));
      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Get validator info
    router.get("/validator/info", async (req, res) => {
      try {
        const version = await this.connection.getVersion();
        const blockHeight = await this.connection.getBlockHeight();
        const slotLeader = await this.connection.getSlotLeader();

        res.json({
          version,
          blockHeight,
          slotLeader: slotLeader.toString(),
          rpcUrl: this.config.validatorRpcUrl,
          faucetUrl: this.config.validatorFaucetUrl,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch validator info",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Get all cloned tokens
    router.get("/tokens", async (req, res) => {
      try {
        const clonedTokens = await this.getClonedTokens();
        res.json({
          tokens: clonedTokens.map((token) => ({
            symbol: token.config.symbol,
            mainnetMint: token.config.mainnetMint,
            mintAuthority: token.mintAuthority.publicKey,
            recipients: token.config.recipients,
            cloneMetadata: token.config.cloneMetadata,
          })),
          count: clonedTokens.length,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch cloned tokens",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Get all cloned programs
    router.get("/programs", async (req, res) => {
      try {
        const clonedPrograms = await this.getClonedPrograms();
        res.json({
          programs: clonedPrograms,
          count: clonedPrograms.length,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch cloned programs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Mint tokens to a wallet
    router.post("/tokens/:symbol/mint", async (req, res) => {
      try {
        const { symbol } = req.params;
        const { walletAddress, amount } = req.body;

        if (!walletAddress || !amount) {
          return res.status(400).json({
            error: "Missing required fields: walletAddress and amount",
          });
        }

        // Validate wallet address
        try {
          new PublicKey(walletAddress);
        } catch {
          return res.status(400).json({
            error: "Invalid wallet address",
          });
        }

        // Validate amount
        if (!Number.isInteger(amount) || amount <= 0) {
          return res.status(400).json({
            error: "Amount must be a positive integer",
          });
        }

        const result = await this.mintTokenToWallet(
          symbol,
          walletAddress,
          amount
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Failed to mint tokens",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Get account balances for a wallet
    router.get("/wallet/:address/balances", async (req, res) => {
      try {
        const { address } = req.params;

        // Validate wallet address
        try {
          new PublicKey(address);
        } catch {
          return res.status(400).json({
            error: "Invalid wallet address",
          });
        }

        const balances = await this.getWalletBalances(address);
        res.json(balances);
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch wallet balances",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Airdrop SOL to a wallet
    router.post("/airdrop", async (req, res) => {
      try {
        const { walletAddress, amount } = req.body;

        if (!walletAddress || !amount) {
          return res.status(400).json({
            error: "Missing required fields: walletAddress and amount",
          });
        }

        // Validate wallet address
        try {
          new PublicKey(walletAddress);
        } catch {
          return res.status(400).json({
            error: "Invalid wallet address",
          });
        }

        const result = await this.airdropSol(walletAddress, amount);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Failed to airdrop SOL",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Get recent transactions
    router.get("/transactions/recent", async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const signatures = await this.connection.getSignaturesForAddress(
          new PublicKey("11111111111111111111111111111111"), // System program
          { limit }
        );

        res.json({
          transactions: signatures,
          count: signatures.length,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch recent transactions",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.use("/api", router);

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({ error: "Endpoint not found" });
    });
  }

  private async getClonedTokens(): Promise<ClonedToken[]> {
    const clonedTokens: ClonedToken[] = [];

    for (const tokenConfig of this.config.config.tokens) {
      const tokenDir = join(
        this.config.workDir,
        `token-${tokenConfig.symbol.toLowerCase()}`
      );
      const modifiedAccountPath = join(tokenDir, "modified.json");
      const sharedMintAuthorityPath = join(
        this.config.workDir,
        "shared-mint-authority.json"
      );

      if (
        existsSync(modifiedAccountPath) &&
        existsSync(sharedMintAuthorityPath)
      ) {
        try {
          const mintAuthorityData = JSON.parse(
            readFileSync(sharedMintAuthorityPath, "utf8")
          );
          let mintAuthority;

          if (Array.isArray(mintAuthorityData)) {
            const keypair = Keypair.fromSecretKey(
              new Uint8Array(mintAuthorityData)
            );
            mintAuthority = {
              publicKey: keypair.publicKey.toBase58(),
              secretKey: Array.from(keypair.secretKey),
            };
          } else {
            mintAuthority = mintAuthorityData;
          }

          clonedTokens.push({
            config: tokenConfig,
            mintAuthorityPath: sharedMintAuthorityPath,
            modifiedAccountPath,
            mintAuthority,
          });
        } catch (error) {
          console.error(
            `Failed to load cloned token ${tokenConfig.symbol}:`,
            error
          );
        }
      }
    }

    return clonedTokens;
  }

  private async getClonedPrograms(): Promise<
    Array<{ name?: string; programId: string; filePath?: string }>
  > {
    const clonedPrograms: Array<{
      name?: string;
      programId: string;
      filePath?: string;
    }> = [];

    for (const programConfig of this.config.config.programs) {
      const programsDir = join(this.config.workDir, "programs");
      const fileName = programConfig.name
        ? `${programConfig.name.toLowerCase().replace(/\s+/g, "-")}.so`
        : `${programConfig.mainnetProgramId}.so`;
      const filePath = join(programsDir, fileName);

      clonedPrograms.push({
        name: programConfig.name,
        programId: programConfig.mainnetProgramId,
        filePath: existsSync(filePath) ? filePath : undefined,
      });
    }

    return clonedPrograms;
  }

  private async mintTokenToWallet(
    symbol: string,
    walletAddress: string,
    amount: number
  ): Promise<any> {
    const clonedTokens = await this.getClonedTokens();
    const token = clonedTokens.find(
      (t) => t.config.symbol.toLowerCase() === symbol.toLowerCase()
    );

    if (!token) {
      throw new Error(`Token ${symbol} not found in cloned tokens`);
    }

    // Use the shared minting function from the mint command
    await mintTokenToWalletShared(
      token,
      walletAddress,
      amount,
      this.config.validatorRpcUrl
    );

    return {
      success: true,
      symbol: token.config.symbol,
      amount,
      walletAddress,
      mintAddress: token.config.mainnetMint,
    };
  }

  private async getWalletBalances(walletAddress: string): Promise<any> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);

      // Get token accounts
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const tokenBalances = [];
      const clonedTokens = await this.getClonedTokens();

      for (const tokenAccount of tokenAccounts.value) {
        try {
          const accountInfo = await this.connection.getAccountInfo(
            tokenAccount.pubkey
          );
          if (accountInfo) {
            // Parse token account data (simplified)
            const data = accountInfo.data;
            if (data.length >= 32) {
              const mintBytes = data.slice(0, 32);
              const mintAddress = new PublicKey(mintBytes).toBase58();

              // Find matching cloned token
              const clonedToken = clonedTokens.find(
                (t) => t.config.mainnetMint === mintAddress
              );

              if (clonedToken) {
                // Get token balance
                const balance = await this.connection.getTokenAccountBalance(
                  tokenAccount.pubkey
                );
                tokenBalances.push({
                  mint: mintAddress,
                  symbol: clonedToken.config.symbol,
                  balance: balance.value.amount,
                  decimals: balance.value.decimals,
                  uiAmount: balance.value.uiAmount,
                });
              }
            }
          }
        } catch (error) {
          // Skip failed token accounts
          continue;
        }
      }

      return {
        walletAddress,
        solBalance: {
          lamports: solBalance,
          sol: solBalance / 1e9,
        },
        tokenBalances,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get wallet balances: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async airdropSol(
    walletAddress: string,
    amount: number
  ): Promise<any> {
    const result = await runCommand(
      "solana",
      [
        "airdrop",
        amount.toString(),
        walletAddress,
        "--url",
        this.config.validatorRpcUrl,
      ],
      { silent: false, debug: false }
    );

    if (!result.success) {
      throw new Error(`Failed to airdrop SOL: ${result.stderr}`);
    }

    return {
      success: true,
      amount,
      walletAddress,
      signature:
        result.stdout.match(/Signature: ([A-Za-z0-9]+)/)?.[1] || "unknown",
    };
  }

  async start(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const host = this.config.host || "127.0.0.1";
        this.server = this.app.listen(this.config.port, host, () => {
          console.log(
            chalk.green(
              `🚀 API Server started on http://${host}:${this.config.port}`
            )
          );
          console.log(
            chalk.gray(
              `   📋 Endpoints available at http://${host}:${this.config.port}/api`
            )
          );
          resolve({ success: true });
        });

        this.server.on("error", (error) => {
          console.error(
            chalk.red(`❌ API Server failed to start: ${error.message}`)
          );
          resolve({ success: false, error: error.message });
        });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve({ success: true });
        return;
      }

      this.server.close((error) => {
        if (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          console.log(chalk.yellow("🛑 API Server stopped"));
          resolve({ success: true });
        }
        this.server = null;
      });
    });
  }

  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }
}
