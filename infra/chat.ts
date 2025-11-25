import { domains } from "./domains";
import { solanaRpcUrl } from "./secrets";

const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const stage = $app.stage;
const isProdStage = stage === "prod" || stage === "production";

export const chatWebsite = new sst.aws.StaticSite("SolforgeChat", {
	path: "apps/chat",
	build: {
		command: "bun run build",
		output: "dist",
	},
	environment: {
		STAGE: stage,
		AI_API_URL: isProdStage ? `https://${domains.ai}` : `http://localhost:4000`,
		VITE_SOLANA_RPC_URL: solanaRpcUrl.value,
		VITE_SOLANA_NETWORK: isProdStage ? "solana" : "solana-devnet",
		VITE_USDC_MINT: isProdStage ? MAINNET_USDC_MINT : DEVNET_USDC_MINT,
	},
	link: [solanaRpcUrl],
	domain: {
		name: domains.chat,
		dns: sst.cloudflare.dns(),
	},
	dev: {
		command: "bun run dev",
	},
});
