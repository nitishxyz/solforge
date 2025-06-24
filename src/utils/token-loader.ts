import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Keypair } from "@solana/web3.js";
import type { TokenConfig } from "../types/config.js";

export interface ClonedToken {
  config: TokenConfig;
  mintAuthorityPath: string;
  modifiedAccountPath: string;
  metadataAccountPath?: string;
  mintAuthority: {
    publicKey: string;
    secretKey: number[];
  };
}

/**
 * Shared utility to load cloned tokens from the work directory.
 * This ensures consistent token loading across CLI and API server.
 */
export async function loadClonedTokens(
  tokenConfigs: TokenConfig[],
  workDir: string = ".solforge"
): Promise<ClonedToken[]> {
  const clonedTokens: ClonedToken[] = [];

  // Load shared mint authority
  const sharedMintAuthorityPath = join(workDir, "shared-mint-authority.json");
  let sharedMintAuthority: { publicKey: string; secretKey: number[] } | null =
    null;

  if (existsSync(sharedMintAuthorityPath)) {
    try {
      const fileContent = JSON.parse(
        readFileSync(sharedMintAuthorityPath, "utf8")
      );

      if (Array.isArray(fileContent)) {
        // New format: file contains just the secret key array
        const keypair = Keypair.fromSecretKey(new Uint8Array(fileContent));
        sharedMintAuthority = {
          publicKey: keypair.publicKey.toBase58(),
          secretKey: Array.from(keypair.secretKey),
        };

        // Check metadata for consistency
        const metadataPath = join(workDir, "shared-mint-authority-meta.json");
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
          if (metadata.publicKey !== sharedMintAuthority.publicKey) {
            sharedMintAuthority.publicKey = metadata.publicKey;
          }
        }
      } else {
        // Old format: file contains {publicKey, secretKey}
        sharedMintAuthority = fileContent;
      }
    } catch (error) {
      console.error("Failed to load shared mint authority:", error);
      return [];
    }
  }

  if (!sharedMintAuthority) {
    return [];
  }

  // Load each token that has been cloned
  for (const tokenConfig of tokenConfigs) {
    const tokenDir = join(workDir, `token-${tokenConfig.symbol.toLowerCase()}`);
    const modifiedAccountPath = join(tokenDir, "modified.json");
    const metadataAccountPath = join(tokenDir, "metadata.json");

    // Check if this token has already been cloned
    if (existsSync(modifiedAccountPath)) {
      const clonedToken: ClonedToken = {
        config: tokenConfig,
        mintAuthorityPath: sharedMintAuthorityPath,
        modifiedAccountPath,
        mintAuthority: sharedMintAuthority,
      };

      // Add metadata path if it exists
      if (existsSync(metadataAccountPath)) {
        clonedToken.metadataAccountPath = metadataAccountPath;
      }

      clonedTokens.push(clonedToken);
    }
  }

  return clonedTokens;
}

/**
 * Find a cloned token by its mint address
 */
export function findTokenByMint(
  clonedTokens: ClonedToken[],
  mintAddress: string
): ClonedToken | undefined {
  return clonedTokens.find((token) => token.config.mainnetMint === mintAddress);
}

/**
 * Find a cloned token by its symbol
 */
export function findTokenBySymbol(
  clonedTokens: ClonedToken[],
  symbol: string
): ClonedToken | undefined {
  return clonedTokens.find(
    (token) => token.config.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
