import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
	import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const SOLANA_NETWORK_ENV =
	(import.meta.env.VITE_SOLANA_NETWORK ?? "solana-devnet").toLowerCase();
const RPC_NETWORK_HINT = inferNetworkFromRpc(RPC_URL);
const RESOLVED_NETWORK =
	RPC_NETWORK_HINT && RPC_NETWORK_HINT !== SOLANA_NETWORK_ENV
		? RPC_NETWORK_HINT
		: SOLANA_NETWORK_ENV;

const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const isMainnet =
	RESOLVED_NETWORK === "solana" || RESOLVED_NETWORK === "solana-mainnet";
const DEFAULT_USDC_MINT = isMainnet ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;
const PRIMARY_USDC_MINT =
	import.meta.env.VITE_USDC_MINT ?? DEFAULT_USDC_MINT;
const FALLBACK_USDC_MINT =
	PRIMARY_USDC_MINT === MAINNET_USDC_MINT
		? DEVNET_USDC_MINT
		: PRIMARY_USDC_MINT === DEVNET_USDC_MINT
			? MAINNET_USDC_MINT
			: null;

function inferNetworkFromRpc(rpcUrl: string | undefined | null): string | null {
	if (!rpcUrl) return null;
	const lower = rpcUrl.toLowerCase();
	if (lower.includes("mainnet")) return "solana";
	if (lower.includes("devnet")) return "solana-devnet";
	if (lower.includes("testnet")) return "solana-testnet";
	return null;
}

function shouldRetryWithFallback(error: unknown): boolean {
	if (!error) return false;
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return (
		typeof message === "string" &&
		message.includes("Token mint could not be unpacked")
	);
}

async function fetchMintBalance(
	connection: Connection,
	publicKey: PublicKey,
	mint: string,
): Promise<number> {
	const usdcMint = new PublicKey(mint);
	const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
		publicKey,
		{
			mint: usdcMint,
		},
	);

	if (tokenAccounts.value.length === 0) {
		return 0;
	}

	let totalBalance = 0;
	for (const account of tokenAccounts.value) {
		const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
		if (amount) {
			totalBalance += amount;
		}
	}
	return totalBalance;
}

export async function getWalletUSDCBalance(
	walletAddress: string,
): Promise<string> {
	try {
		const connection = new Connection(RPC_URL, "confirmed");
		const publicKey = new PublicKey(walletAddress);

		try {
			const balance = await fetchMintBalance(
				connection,
				publicKey,
				PRIMARY_USDC_MINT,
			);
			return balance.toFixed(2);
		} catch (error) {
			if (FALLBACK_USDC_MINT && shouldRetryWithFallback(error)) {
				console.warn(
					"Primary USDC mint lookup failed, retrying with fallback mint",
					error,
				);
				const fallbackBalance = await fetchMintBalance(
					connection,
					publicKey,
					FALLBACK_USDC_MINT,
				);
				return fallbackBalance.toFixed(2);
			}
			throw error;
		}
	} catch (error) {
		console.error("Failed to fetch wallet USDC balance:", error);
		return "0.00";
	}
}
