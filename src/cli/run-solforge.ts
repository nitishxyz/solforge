import * as p from "@clack/prompts";
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

const CONFIG_PATH = "sf.config.json";

export async function runSolforge() {
	const config = await ensureConfig();
	await startWithConfig(config);
}

async function ensureConfig(): Promise<SolforgeConfig> {
	const exists = await Bun.file(CONFIG_PATH).exists();
	if (!exists) {
		p.intro("Solforge setup");
		const config = await runSetupWizard();
		await saveConfig(config);
		p.outro("Configuration saved");
		return config;
	}

	const current = await readConfig(CONFIG_PATH);
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

async function startWithConfig(config: SolforgeConfig) {
	const host = String(process.env.RPC_HOST || "127.0.0.1");
	const rpcPort = Number(config.server.rpcPort || defaultConfig.server.rpcPort);
	const wsPort = Number(config.server.wsPort || rpcPort + 1);
	const guiEnabled = config.gui?.enabled !== false;
	const guiPort = Number(config.gui?.port ?? defaultConfig.gui.port);

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

		p.log.success(
			`Solforge ready ➜ HTTP http://${host}:${started.rpcPort} | WS ws://${host}:${started.wsPort}${
				started.guiPort ? ` | GUI http://${host}:${started.guiPort}` : ""
			}`,
		);
	} catch (error) {
		spinner.stop("Failed to start RPC");
		p.log.error(String(error));
		process.exitCode = 1;
	}
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
