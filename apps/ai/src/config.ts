import { Resource } from "sst";

export const config = {
	port: 4000,
	minBalance: 0.05,
	markup: 1.005,

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
		network: "solana",
		usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet USDC
	},
} as const;
