#!/usr/bin/env bun
import { BUILTIN_AGENTS, createEmbeddedApp } from "@agi-cli/server";
import { serveWebUI } from "@agi-cli/web-ui";
import chalk from "chalk";

async function main() {
	try {
		// Parse command line arguments
		const args = process.argv.slice(2);
		const portIndex = args.indexOf("--port");
		const hostIndex = args.indexOf("--host");
		const providerIndex = args.indexOf("--provider");
		const modelIndex = args.indexOf("--model");
		const apiKeyIndex = args.indexOf("--api-key");
		const agentIndex = args.indexOf("--agent");

		if (portIndex === -1 || !args[portIndex + 1]) {
			console.error(
				"Usage: agi-server-entry --port <port> [--host <host>] [--provider <provider>] [--model <model>] [--api-key <key>] [--agent <agent>]",
			);
			process.exit(1);
		}

		const port = parseInt(String(args[portIndex + 1]), 10);
		const host = hostIndex !== -1 && args[hostIndex + 1] ? String(args[hostIndex + 1]) : "127.0.0.1";
		const provider = providerIndex !== -1 && args[providerIndex + 1] ? String(args[providerIndex + 1]) : undefined;
		const model = modelIndex !== -1 && args[modelIndex + 1] ? String(args[modelIndex + 1]) : undefined;
		const apiKey = apiKeyIndex !== -1 && args[apiKeyIndex + 1] ? String(args[apiKeyIndex + 1]) : undefined;
		const agent = agentIndex !== -1 && args[agentIndex + 1] ? String(args[agentIndex + 1]) : "general";

		// Get API key from environment if not provided
		let finalApiKey = apiKey;
		if (!finalApiKey && provider) {
			const envVarName = `${provider.toUpperCase()}_API_KEY`;
			finalApiKey = process.env[envVarName];
			
			if (!finalApiKey) {
				console.error(chalk.red(`❌ API key not provided and ${envVarName} environment variable not set`));
				console.log(chalk.yellow(`💡 Set your API key with: export ${envVarName}=your-api-key`));
				process.exit(1);
			}
		}

		// Build config object, only including fields that are provided
		const appConfig: any = {
			agents: {
				general: { ...BUILTIN_AGENTS.general },
				build: { ...BUILTIN_AGENTS.build },
			},
		};

		// Only add provider if explicitly provided
		if (provider) {
			appConfig.provider = provider as "openrouter" | "anthropic" | "openai";
		}

		// Only add model if explicitly provided
		if (model) {
			appConfig.model = model;
		}

		// Only add apiKey if available
		if (finalApiKey) {
			appConfig.apiKey = finalApiKey;
		}

		// Only add agent if explicitly provided
		if (agent && agent !== "general") {
			appConfig.agent = agent as "general" | "build";
		}

		// Create the AGI app
		const app = createEmbeddedApp(appConfig);

		// Serve web UI
		const handleWebUI = serveWebUI({
			prefix: "/ui",
		});

		// Create server
		const server = Bun.serve({
			port,
			hostname: host,
			async fetch(req) {
				const url = new URL(req.url);

				// Serve the bundled web UI first
				const webUIResponse = await handleWebUI(req);
				if (webUIResponse) return webUIResponse;

				// Health probe
				if (url.pathname === "/api/health") {
					return Response.json({
						status: "healthy",
						uptime: process.uptime(),
						...(provider && { provider }),
						...(model && { model }),
						agent,
					});
				}

				// Delegate remaining requests to the SDK server
				return app.fetch(req);
			},
		});

		console.log(chalk.green(`🤖 AGI Server started successfully!`));
		console.log(chalk.cyan(`🌐 Web UI: http://${host}:${server.port}/ui`));
		if (provider) console.log(chalk.gray(`   Provider: ${provider}`));
		if (model) console.log(chalk.gray(`   Model: ${model}`));
		console.log(chalk.gray(`   Agent: ${agent}`));
		console.log(
			chalk.gray(
				`   (The web UI should auto-detect and connect to http://${host}:${server.port})`,
			),
		);

		// Keep the process alive
		process.on("SIGTERM", () => {
			console.log(chalk.yellow("🤖 AGI Server received SIGTERM, shutting down..."));
			process.exit(0);
		});

		process.on("SIGINT", () => {
			console.log(chalk.yellow("🤖 AGI Server received SIGINT, shutting down..."));
			process.exit(0);
		});

		// Keep process alive
		setInterval(() => {}, 1000);
	} catch (error) {
		console.error(
			chalk.red(
				`❌ AGI Server error: ${
					error instanceof Error ? error.message : String(error)
				}`,
			),
		);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(
		chalk.red(
			`❌ Fatal error: ${
				error instanceof Error ? error.message : String(error)
			}`,
		),
	);
	process.exit(1);
});
