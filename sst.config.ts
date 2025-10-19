/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "solforge",
			removal: input?.stage === "production" ? "retain" : "remove",
			home: "aws",
		};
	},
	async run() {
		new sst.aws.Astro("SolForgeWebsite", {
			path: "apps/website",
		});
	},
});
