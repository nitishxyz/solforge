import * as p from "@clack/prompts";
import chalk from "chalk";
import { BUILTIN_AGENTS, createEmbeddedApp } from "@agi-cli/server";
import { serveWebUI } from "@agi-cli/web-ui";
import {
	defaultConfig,
	readConfig,
	type SolforgeConfig,
	writeConfig,
} from "../config";
import { startRpcServers } from "../rpc/start";
import { bootstrapEnvironment } from "./bootstrap";
import { cancelSetup } from "./setup-utils";
import { runSetupWizard } from "./setup-wizard";
import { parseFlags } from "./utils/args";

const CONFIG_PATH = "sf.config.json";

export async function runSolforge(args: string[] = []) {
	const { flags } = parseFlags(args);
	const ci = flags.ci === true || flags.y === true;
	const config = await ensureConfig(ci);
	await startWithConfig(config, args);
}

async function ensureConfig(ci = false): Promise<SolforgeConfig> {
	const exists = await Bun.file(CONFIG_PATH).exists();
	if (!exists) {
		if (ci) {
			await saveConfig(defaultConfig);
			return defaultConfig;
		}
		p.intro("Solforge setup");
		const config = await runSetupWizard();
		await saveConfig(config);
		p.outro("Configuration saved");
		return config;
	}

	const current = await readConfig(CONFIG_PATH);
	if (ci) return current;
	const reuse = await p.confirm({
		message: `Use existing config at ${CONFIG_PATH}?`,
		initialValue: true,
	});
	if (p.isCancel(reuse)) cancelSetup();

	if (reuse) return current;

	const updated = await runSetupWizard(current);
	await saveConfig(updated);
	return updated;
}

async function startWithConfig(config: SolforgeConfig, args: string[] = []) {
	const { flags } = parseFlags(args);
	const host = String(
		flags.network === true
			? "0.0.0.0"
			: ((flags.host as string) ?? process.env.RPC_HOST ?? "127.0.0.1"),
	);
	const rpcPort = Number(config.server.rpcPort || defaultConfig.server.rpcPort);
	const wsPort = Number(config.server.wsPort || rpcPort + 1);
	const guiEnabled = config.gui?.enabled !== false;
	const guiPort = Number(config.gui?.port ?? defaultConfig.gui.port);
	if (config.agi?.enabled) {
		const agiPort = Number(config.agi.port ?? 3456);
		process.env.SOLFORGE_AGI_PORT = String(agiPort);
	} else {
		delete process.env.SOLFORGE_AGI_PORT;
	}

	const spinner = p.spinner();
	const guiPart = guiEnabled ? `, GUI ${guiPort}` : "";
	spinner.start(
		`Starting RPC on ${host}:${rpcPort} (WS ${wsPort}${guiPart})...`,
	);
	try {
		const started = startRpcServers({
			rpcPort,
			wsPort,
			dbMode: config.server.db.mode,
			dbPath: config.server.db.path,
			host,
			guiEnabled,
			guiPort,
		});
		spinner.stop("RPC started");

		await waitForRpc(`http://${host}:${started.rpcPort}`);
		await bootstrapEnvironment(config, host, started.rpcPort);

		let agiStarted: {
			port: number;
			url: string;
			provider?: string;
			model?: string;
		} | null = null;
		if (config.agi?.enabled) {
			agiStarted = await startAgiServer(config, host, flags.debug === true);
		}

		const agiPart = agiStarted
			? ` | AGI http://${host}:${agiStarted.port}/ui`
			: "";
		p.log.success(
			`Solforge ready ➜ HTTP http://${host}:${started.rpcPort} | WS ws://${host}:${started.wsPort}${
				started.guiPort ? ` | GUI http://${host}:${started.guiPort}` : ""
			}${agiPart}`,
		);
	} catch (error) {
		spinner.stop("Failed to start RPC");
		p.log.error(String(error));
		process.exitCode = 1;
	}
}

async function startAgiServer(
	config: SolforgeConfig,
	host: string,
	_debug: boolean = false,
): Promise<{
	port: number;
	url: string;
	provider?: string;
	model?: string;
} | null> {
	if (!config.agi?.enabled) return null;

	const agiConfig = config.agi;
	const port = agiConfig.port || 3456;
	const provider = agiConfig.provider;
	const model = agiConfig.model;
	const agent = agiConfig.agent || "general";

	if (provider) {
		const apiKey =
			agiConfig.apiKey || process.env[`${provider.toUpperCase()}_API_KEY`];

		if (!apiKey) {
			console.log(
				chalk.yellow(
					`⚠️  AGI server is enabled with provider "${provider}" but no API key found. Set ${provider.toUpperCase()}_API_KEY environment variable.`,
				),
			);
			return null;
		}
	}

	try {
		type AppConfig = {
			agents: {
				general: typeof BUILTIN_AGENTS.general;
				build: typeof BUILTIN_AGENTS.build;
			};
			provider?: "openrouter" | "anthropic" | "openai";
			model?: string;
			apiKey?: string;
			agent?: "general" | "build";
		};

		const appConfig: AppConfig = {
			agents: {
				general: { ...BUILTIN_AGENTS.general },
				build: { ...BUILTIN_AGENTS.build },
			},
		};

		if (provider) {
			appConfig.provider = provider as "openrouter" | "anthropic" | "openai";
		}

		if (model) {
			appConfig.model = model;
		}

		if (agiConfig.apiKey) {
			appConfig.apiKey = agiConfig.apiKey;
		}

		if (agent && agent !== "general") {
			appConfig.agent = agent as "general" | "build";
		}

		const app = createEmbeddedApp(appConfig);
		const handleWebUI = serveWebUI({ prefix: "/ui" });

		const server = Bun.serve({
			port,
			hostname: host,
			async fetch(req) {
				const url = new URL(req.url);

				const webUIResponse = await handleWebUI(req);
				if (webUIResponse) return webUIResponse;

				if (url.pathname === "/api/health") {
					return Response.json({
						status: "healthy",
						uptime: process.uptime(),
						...(provider && { provider }),
						...(model && { model }),
						agent,
					});
				}

				return app.fetch(req);
			},
		});

		await Bun.sleep(500);

		try {
			const response = await fetch(`http://${host}:${port}/api/health`);
			if (response.ok) {
				console.log(chalk.green(`🤖 AGI Server started on port ${port}`));
				if (provider) console.log(chalk.gray(`   Provider: ${provider}`));
				if (model) console.log(chalk.gray(`   Model: ${model}`));
				console.log(chalk.gray(`   Agent: ${agent}`));
				console.log(chalk.gray(`   Web UI: http://${host}:${server.port}/ui`));
				return { port, url: `http://${host}:${port}`, provider, model };
			}
		} catch (error) {
			console.log(
				chalk.yellow(
					`⚠️  AGI server health check failed: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
		}
	} catch (error) {
		console.log(
			chalk.yellow(
				`⚠️  Failed to start AGI server: ${
					error instanceof Error ? error.message : String(error)
				}`,
			),
		);
	}

	return null;
}

async function waitForRpc(url: string, timeoutMs = 10_000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(`${url}/health`);
			if (res.ok) return;
		} catch {}
		await Bun.sleep(200);
	}
	throw new Error("RPC server did not become ready in time");
}

async function saveConfig(config: SolforgeConfig) {
	await writeConfig(config, CONFIG_PATH);
	p.log.success(`Updated ${CONFIG_PATH}`);
}
