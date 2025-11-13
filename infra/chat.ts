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
    STAGE: process.env.STAGE,
    AI_API_URL: `https://${domains.ai}`,
    VITE_SOLANA_RPC_URL: solanaRpcUrl.value,
    VITE_SOLANA_NETWORK: isProdStage ? "solana" : "solana-devnet",
    VITE_USDC_MINT: isProdStage
      ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  },
  domain: {
    name: domains.chat,
    dns: sst.cloudflare.dns(),
  },
  dev: {
    command: "bun run dev",
  },
});
