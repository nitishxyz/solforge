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
		const { script } = await import("./infra/script");
		const { website } = await import("./infra/website");

		return {
			script: script.url,
			website: website.url,
		};
	},
});
