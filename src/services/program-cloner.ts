import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { Connection, PublicKey } from "@solana/web3.js";
import { runCommand } from "../utils/shell.js";
import type { ProgramConfig } from "../types/config.js";

export class ProgramCloner {
  private workDir: string;

  constructor(workDir: string = ".testpilot") {
    this.workDir = workDir;
  }

  /**
   * Clone programs for validator startup (saved as .so files)
   */
  async clonePrograms(
    programs: ProgramConfig[],
    targetCluster: string = "mainnet-beta"
  ): Promise<
    Array<{
      success: boolean;
      program: ProgramConfig;
      error?: string;
      filePath?: string;
    }>
  > {
    console.log(chalk.cyan("\n🔧 Cloning programs from mainnet..."));

    if (!existsSync(this.workDir)) {
      mkdirSync(this.workDir, { recursive: true });
    }

    const programsDir = join(this.workDir, "programs");
    if (!existsSync(programsDir)) {
      mkdirSync(programsDir, { recursive: true });
    }

    const results = [];

    for (const program of programs) {
      console.log(
        chalk.gray(
          `  📦 Processing ${program.name || program.mainnetProgramId}...`
        )
      );

      try {
        // Clone dependencies first
        if (program.dependencies && program.dependencies.length > 0) {
          console.log(
            chalk.gray(
              `    📚 Cloning ${program.dependencies.length} dependencies...`
            )
          );
          for (const depId of program.dependencies) {
            await this.cloneSingleProgram(depId, programsDir, targetCluster);
          }
        }

        // Clone the main program
        const result = await this.cloneSingleProgram(
          program.mainnetProgramId,
          programsDir,
          targetCluster,
          program.name
        );

        results.push({
          success: true,
          program,
          filePath: result.filePath,
        });

        console.log(chalk.gray(`    ✓ Cloned to ${result.filePath}`));
      } catch (error) {
        console.error(
          chalk.red(`    ❌ Failed to clone ${program.mainnetProgramId}`)
        );
        console.error(
          chalk.red(
            `       ${error instanceof Error ? error.message : String(error)}`
          )
        );

        results.push({
          success: false,
          program,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    console.log(
      chalk.cyan(`\n✅ Cloned ${successful}/${programs.length} programs`)
    );

    return results;
  }

  /**
   * Clone a single program from mainnet
   */
  private async cloneSingleProgram(
    programId: string,
    outputDir: string,
    cluster: string = "mainnet-beta",
    name?: string
  ): Promise<{ filePath: string }> {
    const fileName = name
      ? `${name.toLowerCase().replace(/\s+/g, "-")}.so`
      : `${programId}.so`;
    const outputPath = join(outputDir, fileName);

    // Skip if already exists
    if (existsSync(outputPath)) {
      return { filePath: outputPath };
    }

    // Use solana account command to fetch program data
    const rpcUrl = this.getClusterUrl(cluster);
    const accountResult = await runCommand(
      "solana",
      ["account", programId, "--output", "json", "--url", rpcUrl],
      { silent: true }
    );

    if (!accountResult.success) {
      throw new Error(
        `Failed to fetch program account: ${accountResult.stderr}`
      );
    }

    try {
      const accountData = JSON.parse(accountResult.stdout);
      const programData = accountData.account.data;

      if (!programData || programData[1] !== "base64") {
        throw new Error("Invalid program data format");
      }

      // Decode base64 program data
      const binaryData = Buffer.from(programData[0], "base64");

      // Write as .so file
      writeFileSync(outputPath, binaryData);

      return { filePath: outputPath };
    } catch (error) {
      throw new Error(
        `Failed to process program data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Generate validator arguments for cloned programs
   */
  generateValidatorArgs(
    clonedPrograms: Array<{
      success: boolean;
      program: ProgramConfig;
      filePath?: string;
    }>
  ): string[] {
    const args: string[] = [];

    for (const result of clonedPrograms) {
      if (result.success && result.filePath) {
        args.push("--bpf-program");
        args.push(result.program.mainnetProgramId);
        args.push(result.filePath);
      }
    }

    return args;
  }

  /**
   * Deploy program to running validator (hot deployment)
   */
  async deployToRunningValidator(
    programId: string,
    rpcUrl: string,
    name?: string
  ): Promise<{ success: boolean; deployedAddress?: string; error?: string }> {
    try {
      console.log(
        chalk.cyan(`\n🚀 Hot deploying program ${name || programId}...`)
      );

      // First, clone the program if we don't have it
      const programsDir = join(this.workDir, "programs");
      if (!existsSync(programsDir)) {
        mkdirSync(programsDir, { recursive: true });
      }

      const cloneResult = await this.cloneSingleProgram(
        programId,
        programsDir,
        "mainnet-beta",
        name
      );

      // Deploy to running validator using solana program deploy
      console.log(chalk.gray("  📤 Deploying to validator..."));

      const deployResult = await runCommand(
        "solana",
        [
          "program",
          "deploy",
          cloneResult.filePath,
          "--program-id",
          programId,
          "--url",
          rpcUrl,
        ],
        { silent: false }
      );

      if (!deployResult.success) {
        return {
          success: false,
          error: `Deployment failed: ${
            deployResult.stderr || deployResult.stdout
          }`,
        };
      }

      console.log(
        chalk.green(`  ✅ Successfully deployed ${name || programId}`)
      );

      return {
        success: true,
        deployedAddress: programId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get cluster RPC URL
   */
  private getClusterUrl(cluster: string): string {
    switch (cluster) {
      case "mainnet-beta":
        return "https://api.mainnet-beta.solana.com";
      case "devnet":
        return "https://api.devnet.solana.com";
      case "testnet":
        return "https://api.testnet.solana.com";
      default:
        return cluster; // Assume it's a custom URL
    }
  }

  /**
   * Verify program exists on cluster
   */
  async verifyProgram(
    programId: string,
    cluster: string = "mainnet-beta"
  ): Promise<boolean> {
    try {
      const connection = new Connection(this.getClusterUrl(cluster));
      const programAccount = await connection.getAccountInfo(
        new PublicKey(programId)
      );
      return programAccount !== null && programAccount.executable;
    } catch {
      return false;
    }
  }

  /**
   * Get program info from cluster
   */
  async getProgramInfo(
    programId: string,
    cluster: string = "mainnet-beta"
  ): Promise<{
    exists: boolean;
    executable?: boolean;
    owner?: string;
    size?: number;
  }> {
    try {
      const connection = new Connection(this.getClusterUrl(cluster));
      const programAccount = await connection.getAccountInfo(
        new PublicKey(programId)
      );

      if (!programAccount) {
        return { exists: false };
      }

      return {
        exists: true,
        executable: programAccount.executable,
        owner: programAccount.owner.toBase58(),
        size: programAccount.data.length,
      };
    } catch (error) {
      return { exists: false };
    }
  }
}
