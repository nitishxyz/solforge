import { domains } from "./domains";
import { solanaRpcUrl } from "./secrets";

export const chatWebsite = new sst.aws.StaticSite("SolforgeChat", {
  path: "apps/chat",
  build: {
    command: "bun run build",
    output: "dist",
  },
  environment: {
    AI_API_URL: `https://${domains.ai}`,
    VITE_SOLANA_RPC_URL: solanaRpcUrl.value,
  },
  domain: {
    name: domains.chat,
    dns: sst.cloudflare.dns(),
  },
  dev: {
    command: "bun run dev",
  },
});
