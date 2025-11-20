import { domains } from "./domains";
import { solanaRpcUrl } from "./secrets";

const isProdStage = process.env.STAGE === "prod";

export const chatWebsite = new sst.aws.StaticSite("SolforgeChat", {
	path: "apps/chat",
	build: {
		command: "bun run build",
		output: "dist",
	},
	environment: {
		STAGE: process.env.STAGE || "prod",
		AI_API_URL: `https://${domains.ai}`,
		VITE_SOLANA_RPC_URL: solanaRpcUrl.value,
		VITE_SOLANA_NETWORK: "solana",
		VITE_USDC_MINT: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
	},
	domain: {
		name: domains.chat,
		dns: sst.cloudflare.dns(),
	},
	dev: {
		command: "bun run dev",
	},
});
