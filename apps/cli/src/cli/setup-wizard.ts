import * as p from "@clack/prompts";
import { readConfig, writeConfig } from "../config/index.ts";
import chalk from "chalk";

function cancelSetup(): never {
	p.cancel("Setup canceled.");
	process.exit(0);
}

function validatePort(v: string): string | undefined {
	const num = Number(v);
	if (Number.isNaN(num) || num < 1024 || num > 65535)
		return "Port must be between 1024 and 65535";
	return undefined;
}

function ensure<T>(v: T | symbol): T {
	if (typeof v === "symbol") cancelSetup();
	return v;
}

export async function runSetupWizard(configFile?: string) {
	p.intro(chalk.cyan.bold("SolForge Configuration"));

	const base = await readConfig(configFile);

	const rpcPortResp = await p.text({
		message: "RPC port",
		initialValue: String(base.server.rpcPort),
		validate: validatePort,
	});
	if (p.isCancel(rpcPortResp)) cancelSetup();
	const rpcPort = Number(rpcPortResp);

	const wsPortResp = await p.text({
		message: "WS port",
		initialValue: String(base.server.wsPort),
		validate: validatePort,
	});
	if (p.isCancel(wsPortResp)) cancelSetup();
	const wsPort = Number(wsPortResp);

	const guiEnabledResp = await p.confirm({
		message: "Enable GUI?",
		initialValue: base.gui.enabled,
	});
	if (p.isCancel(guiEnabledResp)) cancelSetup();
	const guiEnabled = guiEnabledResp !== false;

	let guiPort = base.gui.port;
	if (guiEnabled) {
		guiPort = Number(
			ensure(
				await p.text({
					message: "GUI port",
					initialValue: String(guiPort),
					validate: validatePort,
				}),
			),
		);
	}

	const agiEnabledResp = await p.confirm({
		message: "Enable AGI?",
		initialValue: base.agi?.enabled ?? false,
	});
	if (p.isCancel(agiEnabledResp)) cancelSetup();
	const agiEnabled = agiEnabledResp !== false;

	let agiPort = base.agi?.port ?? 3456;
	let agiProvider = base.agi?.provider;
	let agiModel = base.agi?.model;
	let agiApiKey = base.agi?.apiKey;

	if (agiEnabled) {
		agiPort = Number(
			ensure(
				await p.text({
					message: "AGI port",
					initialValue: String(agiPort),
					validate: validatePort,
				}),
			),
		);

		const providerResp = await p.select({
			message: "AGI provider (optional - AGI handles fallback)",
			options: [
				{ value: undefined, label: "None (use AGI defaults)" },
				{ value: "openrouter", label: "OpenRouter" },
				{ value: "anthropic", label: "Anthropic" },
				{ value: "openai", label: "OpenAI" },
			],
			initialValue: agiProvider,
		});
		if (p.isCancel(providerResp)) cancelSetup();
		agiProvider = providerResp as "openrouter" | "anthropic" | "openai" | undefined;

		if (agiProvider) {
			const modelResp = await p.text({
				message: "Model (optional)",
				initialValue: agiModel ?? "",
			});
			if (p.isCancel(modelResp)) cancelSetup();
			agiModel = modelResp || undefined;

			const apiKeyResp = await p.text({
				message: `API key (leave blank to use ${agiProvider.toUpperCase()}_API_KEY env var)`,
				initialValue: agiApiKey ?? "",
			});
			if (p.isCancel(apiKeyResp)) cancelSetup();
			agiApiKey = apiKeyResp || undefined;
		}
	}

	const updated = {
		...base,
		server: { ...base.server, rpcPort, wsPort },
		gui: { ...base.gui, enabled: guiEnabled, port: guiPort },
		agi: agiEnabled
			? {
					enabled: true,
					port: agiPort,
					host: base.agi?.host ?? "127.0.0.1",
					...(agiProvider && { provider: agiProvider }),
					...(agiModel && { model: agiModel }),
					...(agiApiKey && { apiKey: agiApiKey }),
					agent: base.agi?.agent ?? "general",
				}
			: { ...base.agi, enabled: false },
	};

	await writeConfig(updated, configFile);

	p.outro(chalk.green("Configuration saved"));
}
