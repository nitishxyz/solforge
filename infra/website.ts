import { domains } from "./domains";

export const website = new sst.aws.Astro("SolforgeWeb", {
    path: "apps/website",
    domain: {
      name: "solforge.sh",
      dns: sst.cloudflare.dns(),
    },
});
