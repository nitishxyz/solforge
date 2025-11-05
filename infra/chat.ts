import { domains } from "./domains";

export const chatWebsite = new sst.aws.Astro("SolforgeChat", {
  path: "apps/chat",
  domain: {
    name: domains.chat,
    dns: sst.cloudflare.dns(),
  },
  dev: {
    command: "bun run dev",
  },
});
