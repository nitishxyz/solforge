import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const wallet = Keypair.generate();

console.log("\n🔑 New Test Wallet Generated\n");
console.log("Public Key:  ", wallet.publicKey.toBase58());
console.log("Private Key: ", bs58.encode(wallet.secretKey));
console.log("\n📝 Instructions:");
console.log("1. Copy the private key above");
console.log("2. Update test/test-client.ts with this private key");
console.log("3. Fund this wallet on devnet:");
console.log(`   solana airdrop 2 ${wallet.publicKey.toBase58()} --url devnet`);
console.log("   Or visit: https://faucet.solana.com");
console.log("");
