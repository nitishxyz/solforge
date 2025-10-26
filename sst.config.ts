/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "solforge",
      removal: input?.stage === "production" ? "retain" : "remove",
      // protect: ["prod"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: "slashforge",
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    await import("./infra/secrets");
    const { script } = await import("./infra/script");
    const { website } = await import("./infra/website");

    const { vpc } = await import("./infra/vpc");
    const { apiRouter, apiService } = await import("./infra/ai");

    return {
      script: script.url,
      website: website.url,
      vpcId: vpc.id,
      apiRouter: apiRouter.url,
      apiService: apiService.url,
    };
  },
});
