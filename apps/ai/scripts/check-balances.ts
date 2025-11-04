import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const TEST_WALLET = "HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw";

// Get platform wallet from environment or SST
let PLATFORM_WALLET = process.env.PLATFORM_WALLET;

async function checkBalance(walletAddress: string, label: string) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const pubkey = new PublicKey(walletAddress);
  const mint = new PublicKey(DEVNET_USDC_MINT);

  // Get SOL balance
  const solBalance = await connection.getBalance(pubkey);
  console.log(`\n${label}:`);
  console.log(`  Address: ${walletAddress}`);
  console.log(`  SOL: ${solBalance / 1e9} SOL`);

  // Get USDC token account
  try {
    const ata = await getAssociatedTokenAddress(
      mint,
      pubkey,
      false,
      TOKEN_PROGRAM_ID
    );

    const tokenAccount = await connection.getTokenAccountBalance(ata);
    console.log(`  USDC: ${tokenAccount.value.uiAmount} USDC`);
    console.log(`  Token Account: ${ata.toBase58()}`);
  } catch (error: any) {
    console.log(`  USDC: No token account found`);
  }
}

async function main() {
  console.log("🔍 Checking wallet balances on Devnet\n");
  console.log("=" .repeat(60));

  // Try to get platform wallet from SST if not in env
  if (!PLATFORM_WALLET) {
    try {
      const { Resource } = await import("sst");
      PLATFORM_WALLET = Resource.PlatformWallet.value;
    } catch (e) {
      console.error("❌ Could not get platform wallet from SST or env");
      console.log("Set PLATFORM_WALLET env var or run with sst shell");
      process.exit(1);
    }
  }

  await checkBalance(TEST_WALLET, "Test Wallet");
  await checkBalance(PLATFORM_WALLET, "Platform Wallet");

  console.log("\n" + "=".repeat(60));
}

main();
