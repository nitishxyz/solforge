import { Resource } from "sst";

const stage = process.env.STAGE !== "prod" ? "dev" : "prod";
const isProdStage = stage === "prod";

const SOLANA_MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const config = {
	port: 4000,
	minBalance: 0.05,
	markup: 1.005,
	stage,
	isProdStage,

	openai: {
		apiKey: Resource.OpenAiApiKey.value,
	},

	anthropic: {
		apiKey: Resource.AnthropicApiKey.value,
	},

	facilitator: {
		url: "https://facilitator.payai.network",
	},

	payment: {
		companyWallet: Resource.PlatformWallet.value,
		network: isProdStage ? "solana" : "solana-devnet",
		usdcMint: isProdStage ? SOLANA_MAINNET_USDC_MINT : SOLANA_DEVNET_USDC_MINT,
	},
} as const;
