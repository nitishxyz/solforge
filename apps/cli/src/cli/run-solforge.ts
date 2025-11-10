import * as p from "@clack/prompts";
import chalk from "chalk";
import {
	BUILTIN_AGENTS,
	createEmbeddedApp,
	type EmbeddedAppConfig,
} from "@agi-cli/server";
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

const PROVIDER_ENV_VARS = {
	openrouter: "OPENROUTER_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	openai: "OPENAI_API_KEY",
	solforge: "SOLFORGE_PRIVATE_KEY",
} as const;

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
		await runSetupWizard(CONFIG_PATH);
		return await readConfig(CONFIG_PATH);
	}

	const current = await readConfig(CONFIG_PATH);
	if (ci) return current;
	const reuse = await p.confirm({
		message: `Use existing config at ${CONFIG_PATH}?`,
		initialValue: true,
	});
	if (p.isCancel(reuse)) cancelSetup();

	if (reuse) return current;

	await runSetupWizard(CONFIG_PATH);
	return await readConfig(CONFIG_PATH);
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
		// If a custom domain is configured, use it for the AGI server URL
		if (config.agi.domain) {
			process.env.SOLFORGE_AGI_URL = config.agi.domain;
		} else {
			delete process.env.SOLFORGE_AGI_URL;
		}
	} else {
		delete process.env.SOLFORGE_AGI_PORT;
		delete process.env.SOLFORGE_AGI_URL;
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
	const solforgePrivateKey =
		agiConfig.walletPrivateKey || process.env.SOLFORGE_PRIVATE_KEY;

	if (provider === "solforge" && !solforgePrivateKey) {
		console.log(
			chalk.yellow(
				"⚠️  AGI server is enabled with provider \"solforge\" but no wallet private key found. Set SOLFORGE_PRIVATE_KEY environment variable or add it to sf.config.json.",
			),
		);
		return null;
	}

	if (provider && provider !== "solforge") {
		const envVar = PROVIDER_ENV_VARS[provider];
		const apiKey = agiConfig.apiKey || (envVar ? process.env[envVar] : undefined);

		if (!apiKey) {
			console.log(
				chalk.yellow(
					`⚠️  AGI server is enabled with provider "${provider}" but no API key found. Set ${envVar ?? `${provider.toUpperCase()}_API_KEY`} environment variable.`,
				),
			);
			return null;
		}
	}

	try {
		const appConfig: EmbeddedAppConfig = {
			agents: {
				general: { ...BUILTIN_AGENTS.general },
				build: { ...BUILTIN_AGENTS.build },
			},
		};

		// Build CORS origins list
		const corsOrigins: string[] = [];
		
		// Add custom domain if configured
		if (agiConfig.domain) {
			corsOrigins.push(agiConfig.domain);
		}
		
		// Add any additional CORS origins from config
		if (agiConfig.corsOrigins) {
			corsOrigins.push(...agiConfig.corsOrigins);
		}
		
		// Set CORS origins if any were configured
		if (corsOrigins.length > 0) {
			appConfig.corsOrigins = corsOrigins;
		}

		if (provider) {
			appConfig.provider = provider;
		}

		if (model) {
			appConfig.model = model;
		}

		if (agiConfig.apiKey && provider !== "solforge") {
			appConfig.apiKey = agiConfig.apiKey;
		}

		if (solforgePrivateKey) {
			appConfig.auth = {
				...(appConfig.auth ?? {}),
				solforge: { type: "wallet", secret: solforgePrivateKey },
			};
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
