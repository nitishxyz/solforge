import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
	import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// USDC mint address on devnet
const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export async function getWalletUSDCBalance(
	walletAddress: string,
): Promise<string> {
	try {
		const connection = new Connection(RPC_URL, "confirmed");
		const publicKey = new PublicKey(walletAddress);
		const usdcMint = new PublicKey(USDC_MINT_DEVNET);

		// Get token accounts for this wallet
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
			publicKey,
			{
				mint: usdcMint,
			},
		);

		if (tokenAccounts.value.length === 0) {
			return "0.00";
		}

		// Sum all USDC token account balances
		let totalBalance = 0;
		for (const account of tokenAccounts.value) {
			const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
			if (amount) {
				totalBalance += amount;
			}
		}

		return totalBalance.toFixed(2);
	} catch (error) {
		console.error("Failed to fetch wallet USDC balance:", error);
		return "0.00";
	}
}
