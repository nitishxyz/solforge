import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { Keypair } from "@solana/web3.js";
import chalk from "chalk";
import { runCommand } from "../utils/shell.js";
import type { TokenConfig } from "../types/config.js";

export interface ClonedToken {
  config: TokenConfig;
  mintAuthorityPath: string;
  modifiedAccountPath: string;
  mintAuthority: {
    publicKey: string;
    secretKey: number[];
  };
}

export class TokenCloner {
  private workDir: string;

  constructor(workDir: string = ".testpilot") {
    this.workDir = workDir;
    // Ensure work directory exists
    if (!existsSync(this.workDir)) {
      mkdirSync(this.workDir, { recursive: true });
    }
  }

  /**
   * Clone tokens by fetching account data, modifying mint authority, and preparing for validator
   */
  async cloneTokens(
    tokens: TokenConfig[],
    rpcUrl: string = "https://api.mainnet-beta.solana.com",
    debug: boolean = false
  ): Promise<ClonedToken[]> {
    const clonedTokens: ClonedToken[] = [];

    // Generate one shared mint authority for all tokens
    const sharedMintAuthorityPath = join(
      this.workDir,
      "shared-mint-authority.json"
    );
    let sharedMintAuthority: { publicKey: string; secretKey: number[] };

    if (existsSync(sharedMintAuthorityPath)) {
      // Use existing shared mint authority
      console.log(chalk.gray(`🔑 Using existing shared mint authority...`));
      const fileContent = JSON.parse(
        readFileSync(sharedMintAuthorityPath, "utf8")
      );

      // Handle both old format {publicKey, secretKey} and new format [secretKey array]
      if (Array.isArray(fileContent)) {
        // New format: file contains just the secret key array
        const keypair = Keypair.fromSecretKey(new Uint8Array(fileContent));
        sharedMintAuthority = {
          publicKey: keypair.publicKey.toBase58(),
          secretKey: Array.from(keypair.secretKey),
        };

        // Verify consistency with metadata if it exists
        const metadataPath = join(
          this.workDir,
          "shared-mint-authority-meta.json"
        );
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
          if (metadata.publicKey !== sharedMintAuthority.publicKey) {
            console.log(chalk.yellow(`⚠️  Public key mismatch detected!`));
            console.log(chalk.gray(`  Expected: ${metadata.publicKey}`));
            console.log(chalk.gray(`  Got: ${sharedMintAuthority.publicKey}`));
            console.log(
              chalk.gray(
                `  Using the original saved public key for consistency`
              )
            );
            sharedMintAuthority.publicKey = metadata.publicKey;
          }
        }
      } else {
        // Old format: file contains {publicKey, secretKey}
        sharedMintAuthority = fileContent;
      }
    } else {
      // Generate new shared mint authority
      console.log(
        chalk.gray(`🔑 Generating shared mint authority for all tokens...`)
      );
      const keypair = Keypair.generate();
      sharedMintAuthority = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
      };

      // Ensure work directory exists
      if (!existsSync(this.workDir)) {
        mkdirSync(this.workDir, { recursive: true });
      }

      // Save shared mint authority in the format expected by spl-token (just the secret key array)
      // But also save a metadata file for verification
      writeFileSync(
        sharedMintAuthorityPath,
        JSON.stringify(sharedMintAuthority.secretKey)
      );

      // Save metadata for debugging and verification
      const metadataPath = join(
        this.workDir,
        "shared-mint-authority-meta.json"
      );
      writeFileSync(
        metadataPath,
        JSON.stringify(
          {
            publicKey: sharedMintAuthority.publicKey,
            savedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }

    console.log(
      chalk.gray(`  📋 Shared mint authority: ${sharedMintAuthority.publicKey}`)
    );

    for (const token of tokens) {
      console.log(
        chalk.cyan(`🪙 Cloning ${token.symbol} (${token.mainnetMint})...`)
      );

      try {
        const cloned = await this.cloneToken(
          token,
          rpcUrl,
          debug,
          sharedMintAuthority,
          sharedMintAuthorityPath
        );
        clonedTokens.push(cloned);
        console.log(chalk.green(`  ✅ ${token.symbol} cloned successfully`));
      } catch (error) {
        console.error(chalk.red(`  ❌ Failed to clone ${token.symbol}:`));
        console.error(
          chalk.red(
            `     ${error instanceof Error ? error.message : String(error)}`
          )
        );
        throw error; // Stop on first failure
      }
    }

    return clonedTokens;
  }

  /**
   * Clone a single token
   */
  private async cloneToken(
    token: TokenConfig,
    rpcUrl: string,
    debug: boolean = false,
    sharedMintAuthority: { publicKey: string; secretKey: number[] },
    sharedMintAuthorityPath: string
  ): Promise<ClonedToken> {
    const tokenDir = join(this.workDir, `token-${token.symbol.toLowerCase()}`);
    if (!existsSync(tokenDir)) {
      mkdirSync(tokenDir, { recursive: true });
    }

    const originalAccountPath = join(tokenDir, "original.json");
    const modifiedAccountPath = join(tokenDir, "modified.json");

    // Step 1: Fetch original account data from mainnet
    console.log(chalk.gray(`  📥 Fetching account data from mainnet...`));
    if (debug) {
      console.log(chalk.gray(`  🔗 Using RPC: ${rpcUrl}`));
    }

    const fetchResult = await runCommand(
      "solana",
      [
        "account",
        token.mainnetMint,
        "--output",
        "json-compact",
        "--output-file",
        originalAccountPath,
        "--url",
        rpcUrl,
      ],
      { silent: !debug, debug }
    );

    if (!fetchResult.success) {
      console.error(
        chalk.red(`  ❌ Failed to fetch account data for ${token.symbol}`)
      );
      console.error(
        chalk.red(
          `     Command: solana account ${token.mainnetMint} --output json-compact --output-file ${originalAccountPath} --url ${rpcUrl}`
        )
      );
      console.error(chalk.red(`     Exit code: ${fetchResult.exitCode}`));
      console.error(chalk.red(`     Stderr: ${fetchResult.stderr}`));
      if (fetchResult.stdout) {
        console.error(chalk.red(`     Stdout: ${fetchResult.stdout}`));
      }
      throw new Error(`Failed to fetch account data: ${fetchResult.stderr}`);
    }

    // Step 2: Modify account data to use shared mint authority
    console.log(chalk.gray(`  🔄 Modifying mint authority...`));
    await this.modifyMintAuthority(
      originalAccountPath,
      modifiedAccountPath,
      sharedMintAuthority
    );

    return {
      config: token,
      mintAuthorityPath: sharedMintAuthorityPath,
      modifiedAccountPath,
      mintAuthority: sharedMintAuthority,
    };
  }

  /**
   * Modify the mint account data to use a new mint authority
   */
  private async modifyMintAuthority(
    originalPath: string,
    modifiedPath: string,
    mintAuthority: { publicKey: string; secretKey: number[] }
  ): Promise<void> {
    // Read original account data
    const originalData = JSON.parse(readFileSync(originalPath, "utf8"));

    // Decode the base64 account data
    const accountData = Buffer.from(originalData.account.data[0], "base64");

    // Convert to mutable array for modification
    const dataArray = new Uint8Array(accountData);

    // Check if mint authority is set to None (fixed supply)
    const mintAuthorityOption = dataArray[0];
    const hasFixedSupply = mintAuthorityOption === 0;

    if (hasFixedSupply) {
      console.log(
        chalk.yellow(`  ⚠️  Token has fixed supply, making it mintable...`)
      );

      // Set mint_authority_option to Some (1)
      dataArray[0] = 1;

      // Set the mint authority (bytes 4-35)
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(mintAuthority.secretKey)
      );
      const newAuthorityBytes = keypair.publicKey.toBuffer();

      for (let i = 0; i < 32; i++) {
        const byte = newAuthorityBytes[i];
        if (byte !== undefined) {
          dataArray[4 + i] = byte;
        }
      }
    } else {
      console.log(chalk.gray(`  🔄 Updating existing mint authority...`));

      // Create mint authority public key from the keypair
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(mintAuthority.secretKey)
      );
      const newAuthorityBytes = keypair.publicKey.toBuffer();

      // Replace mint authority (starts at byte 4, 32 bytes long)
      for (let i = 0; i < 32; i++) {
        const byte = newAuthorityBytes[i];
        if (byte !== undefined) {
          dataArray[4 + i] = byte;
        }
      }
    }

    // Convert back to base64
    const modifiedData = Buffer.from(dataArray).toString("base64");

    // Create modified account data
    const modifiedAccountData = {
      ...originalData,
      account: {
        ...originalData.account,
        data: [modifiedData, "base64"],
      },
    };

    // Handle rentEpoch properly (needs to be a number, not string)
    let jsonString = JSON.stringify(modifiedAccountData, null, 2);
    jsonString = jsonString.replace(
      /"rentEpoch":\s*\d+/g,
      '"rentEpoch": 18446744073709551615'
    );

    // Save modified account
    writeFileSync(modifiedPath, jsonString);
  }

  /**
   * Get validator arguments for cloned tokens
   */
  getValidatorArgs(clonedTokens: ClonedToken[]): string[] {
    const args: string[] = [];

    for (const token of clonedTokens) {
      args.push(
        "--account",
        token.config.mainnetMint,
        token.modifiedAccountPath
      );
    }

    return args;
  }

  /**
   * Mint initial tokens to mint authority, then to recipients after validator is running
   */
  async mintTokensToRecipients(
    clonedTokens: ClonedToken[],
    rpcUrl: string,
    debug: boolean = false
  ): Promise<void> {
    for (const token of clonedTokens) {
      console.log(chalk.cyan(`💰 Processing ${token.config.symbol}...`));

      // First, mint the default amount to the mint authority
      try {
        await this.mintToMintAuthority(token, rpcUrl, debug);
        console.log(
          chalk.green(
            `  ✅ Minted ${token.config.mintAmount} ${token.config.symbol} to mint authority`
          )
        );
      } catch (error) {
        console.error(chalk.red(`  ❌ Failed to mint to mint authority:`));
        console.error(
          chalk.red(
            `     ${error instanceof Error ? error.message : String(error)}`
          )
        );
        continue; // Skip recipients if mint authority minting failed
      }

      // Then mint to recipients if any are configured
      if (token.config.recipients.length > 0) {
        console.log(
          chalk.gray(
            `  🔄 Minting to ${token.config.recipients.length} recipients...`
          )
        );

        for (const recipient of token.config.recipients) {
          try {
            await this.mintToRecipient(
              token,
              recipient.wallet,
              recipient.amount,
              rpcUrl
            );
            console.log(
              chalk.green(
                `  ✅ Minted ${recipient.amount} ${
                  token.config.symbol
                } to ${recipient.wallet.slice(0, 8)}...`
              )
            );
          } catch (error) {
            console.error(
              chalk.red(
                `  ❌ Failed to mint to ${recipient.wallet.slice(0, 8)}...:`
              )
            );
            console.error(
              chalk.red(
                `     ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        }
      }
    }
  }

  /**
   * Mint initial tokens to the mint authority account
   */
  private async mintToMintAuthority(
    token: ClonedToken,
    rpcUrl: string,
    debug: boolean = false
  ): Promise<void> {
    console.log(
      chalk.gray(
        `  🔄 Minting ${token.config.mintAmount} tokens to mint authority...`
      )
    );

    // Check if associated token account already exists
    if (debug) {
      console.log(
        chalk.gray(`  🔍 Checking if token account already exists...`)
      );
    }

    const checkAccountsResult = await runCommand(
      "spl-token",
      [
        "accounts",
        "--owner",
        token.mintAuthority.publicKey,
        "--url",
        rpcUrl,
        "--output",
        "json",
      ],
      { silent: true }
    );

    let tokenAccountAddress = "";

    if (checkAccountsResult.success && checkAccountsResult.stdout) {
      try {
        const accountsData = JSON.parse(checkAccountsResult.stdout);

        // Look for existing token account for this mint
        for (const account of accountsData.accounts || []) {
          if (account.mint === token.config.mainnetMint) {
            tokenAccountAddress = account.address;
            break;
          }
        }

        if (tokenAccountAddress) {
          if (debug) {
            console.log(
              chalk.gray(
                `  ℹ️  Token account already exists: ${tokenAccountAddress}`
              )
            );
          }
        }
      } catch (error) {
        if (debug) {
          console.log(
            chalk.gray(`  ℹ️  No existing accounts found or parsing error`)
          );
        }
      }
    }

    if (!tokenAccountAddress) {
      // Account doesn't exist, create it
      if (debug) {
        console.log(
          chalk.gray(`  🔧 Creating token account for mint authority...`)
        );
      }

      const createAccountResult = await runCommand(
        "spl-token",
        [
          "create-account",
          token.config.mainnetMint,
          "--owner",
          token.mintAuthority.publicKey,
          "--fee-payer",
          token.mintAuthorityPath,
          "--url",
          rpcUrl,
        ],
        { silent: !debug, debug }
      );

      if (!createAccountResult.success) {
        console.error(chalk.red(`  ❌ Failed to create token account:`));
        console.error(
          chalk.red(
            `     Command: spl-token create-account ${token.config.mainnetMint} --owner ${token.mintAuthority.publicKey} --fee-payer ${token.mintAuthorityPath} --url ${rpcUrl}`
          )
        );
        console.error(
          chalk.red(`     Exit code: ${createAccountResult.exitCode}`)
        );
        console.error(chalk.red(`     Stderr: ${createAccountResult.stderr}`));
        if (createAccountResult.stdout) {
          console.error(
            chalk.red(`     Stdout: ${createAccountResult.stdout}`)
          );
        }
        throw new Error(
          `Failed to create token account: ${createAccountResult.stderr}`
        );
      } else {
        if (debug) {
          console.log(chalk.gray(`  ✅ Token account created successfully`));
        }
        // Extract token account address from create-account output
        const match = createAccountResult.stdout.match(
          /Creating account (\S+)/
        );
        tokenAccountAddress = match?.[1] || "";
      }
    }

    if (!tokenAccountAddress) {
      throw new Error("Failed to determine token account address");
    }

    if (debug) {
      console.log(chalk.gray(`  📍 Token account: ${tokenAccountAddress}`));
    }

    // Mint tokens to the specific token account
    const mintResult = await runCommand(
      "spl-token",
      [
        "mint",
        token.config.mainnetMint,
        token.config.mintAmount.toString(),
        tokenAccountAddress,
        "--mint-authority",
        token.mintAuthorityPath,
        "--fee-payer",
        token.mintAuthorityPath,
        "--url",
        rpcUrl,
      ],
      { silent: !debug, debug }
    );

    if (!mintResult.success) {
      throw new Error(`Failed to mint tokens: ${mintResult.stderr}`);
    }
  }

  /**
   * Mint tokens to a specific recipient
   */
  private async mintToRecipient(
    token: ClonedToken,
    recipientAddress: string,
    amount: number,
    rpcUrl: string
  ): Promise<void> {
    console.log(
      chalk.gray(`  🔄 Minting ${amount} tokens to ${recipientAddress}...`)
    );

    // Check if associated token account already exists
    const checkAccountsResult = await runCommand(
      "spl-token",
      [
        "accounts",
        "--owner",
        recipientAddress,
        "--url",
        rpcUrl,
        "--output",
        "json",
      ],
      { silent: true }
    );

    let tokenAccountAddress = "";

    if (checkAccountsResult.success && checkAccountsResult.stdout) {
      try {
        const accountsData = JSON.parse(checkAccountsResult.stdout);

        // Look for existing token account for this mint
        for (const account of accountsData.accounts || []) {
          if (account.mint === token.config.mainnetMint) {
            tokenAccountAddress = account.address;
            break;
          }
        }
      } catch (error) {
        // No existing accounts found or parsing error, will create new account
      }
    }

    if (!tokenAccountAddress) {
      // Account doesn't exist, create it
      const createAccountResult = await runCommand(
        "spl-token",
        [
          "create-account",
          token.config.mainnetMint,
          "--owner",
          recipientAddress,
          "--fee-payer",
          token.mintAuthorityPath,
          "--url",
          rpcUrl,
        ],
        { silent: true }
      );

      if (!createAccountResult.success) {
        throw new Error(
          `Failed to create token account: ${createAccountResult.stderr}`
        );
      }

      // Extract token account address from create-account output
      const match = createAccountResult.stdout.match(/Creating account (\S+)/);
      tokenAccountAddress = match?.[1] || "";
    }

    if (!tokenAccountAddress) {
      throw new Error("Failed to determine token account address");
    }

    // Mint tokens to the specific token account
    const mintResult = await runCommand(
      "spl-token",
      [
        "mint",
        token.config.mainnetMint,
        amount.toString(),
        tokenAccountAddress,
        "--mint-authority",
        token.mintAuthorityPath,
        "--fee-payer",
        token.mintAuthorityPath,
        "--url",
        rpcUrl,
      ],
      { silent: true }
    );

    if (!mintResult.success) {
      throw new Error(`Failed to mint tokens: ${mintResult.stderr}`);
    }
  }
}
