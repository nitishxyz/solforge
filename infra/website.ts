import { domains } from "./domains";

export const website = new sst.aws.Astro("SolforgeWeb", {
  path: "apps/website",
  domain: {
    name: domains.web,
    dns: sst.cloudflare.dns(),
  },
  dev: {
    command: "bun run dev",
  },
});
