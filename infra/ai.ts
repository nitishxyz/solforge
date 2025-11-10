import { domains } from "./domains";
import {
  anthropicApiKey,
  databaseUrl,
  googleAiApiKey,
  openAiApiKey,
  platformWallet,
} from "./secrets";
import { vpc } from "./vpc";

const cluster = new sst.aws.Cluster("SolforgeCluster", { vpc });

export const apiService = new sst.aws.Service("SolforgeAiService", {
  cluster,
  link: [databaseUrl, openAiApiKey, anthropicApiKey, googleAiApiKey, platformWallet],
  image: {
    dockerfile: "./apps/ai/Dockerfile",
  },
  loadBalancer: {
    ports: [
      { listen: "443/https", forward: "4000/http" },
      { listen: "80/http", redirect: "443/https" },
    ],
    domain: { name: domains.aiService, dns: sst.cloudflare.dns() },
  },
  dev: {
    directory: "apps/ai",
    command: "bun run --watch src/index.ts",
  },
});

export const apiRouter = new sst.aws.Router("SolforgeAiApiRouter", {
  routes: {
    "/*": {
      url: `https://${domains.aiService}`,
    },
  },
  domain: { name: domains.ai, dns: sst.cloudflare.dns() },
});
