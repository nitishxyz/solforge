import * as p from "@clack/prompts";
import { readConfig, writeConfig } from "../config/index.ts";
import chalk from "chalk";
import {
	cancelSetup,
	collectCustomEntries,
	ensure,
	validatePort,
	validatePositiveNumber,
	validatePubkey,
} from "./setup-utils.ts";

const TOKEN_PRESETS = [
	{
		value: "usdc",
		label: "USDC",
		mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
	},
	{
		value: "usdt",
		label: "USDT",
		mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
	},
];

const PROGRAM_PRESETS = [
	{
		value: "jupiter",
		label: "Jupiter",
		programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
	},
	{
		value: "pump",
		label: "Pump core",
		programId: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
	},
	{
		value: "pump-amm",
		label: "Pump AMM",
		programId: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
	},
	{
		value: "pump-fees",
		label: "Pump fees",
		programId: "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
	},
];

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

	const tokenSelection = ensure(
		await p.multiselect({
			message: "Which tokens should be cloned?",
			options: [
				...TOKEN_PRESETS.map((token) => ({
					value: token.value,
					label: `${token.label} (${token.mint})`,
				})),
				{ value: "__custom__", label: "Add custom token mint" },
			],
			initialValues: TOKEN_PRESETS.filter((preset) =>
				base.clone.tokens?.includes(preset.mint),
			).map((preset) => preset.value),
			required: false,
		}),
	) as string[];

	const tokens = await resolveTokens(tokenSelection, base.clone.tokens ?? []);

	const programSelection = ensure(
		await p.multiselect({
			message: "Clone any on-chain programs?",
			options: [
				...PROGRAM_PRESETS.map((program) => ({
					value: program.value,
					label: `${program.label} (${program.programId})`,
				})),
				{ value: "__custom__", label: "Add custom program" },
			],
			initialValues: PROGRAM_PRESETS.filter((preset) =>
				base.clone.programs?.includes(preset.programId),
			).map((preset) => preset.value),
			required: false,
		}),
	) as string[];

	const programs = await resolvePrograms(
		programSelection,
		base.clone.programs ?? [],
	);

	const airdrops = await collectAirdrops(base.bootstrap?.airdrops ?? []);

	const agiEnabledResp = await p.confirm({
		message: "Enable AGI?",
		initialValue: base.agi?.enabled ?? true,
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
		agiProvider = providerResp as
			| "openrouter"
			| "anthropic"
			| "openai"
			| undefined;

		if (agiProvider) {
			const modelResp = await p.text({
				message: "Model (optional)",
				initialValue: agiModel ?? "",
			});
			if (p.isCancel(modelResp)) cancelSetup();
			agiModel = modelResp || undefined;

			const apiKeyResp = await p.text({
				message: `API key (leave blank to use ${agiProvider?.toUpperCase()}_API_KEY env var)`,
				initialValue: agiApiKey ?? "",
			});
			if (p.isCancel(apiKeyResp)) cancelSetup();
			agiApiKey = apiKeyResp || undefined;
		}
	}

	const updated = {
		...base,
		server: { ...base.server, rpcPort, wsPort },
		clone: { ...base.clone, tokens, programs },
		gui: { ...base.gui, enabled: guiEnabled, port: guiPort },
		bootstrap: { airdrops },
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

async function resolveTokens(selections: string[], existing: string[] = []) {
	const set = new Set(existing);
	for (const selection of selections) {
		if (selection === "__custom__") {
			(await collectCustomEntries("token mint address")).forEach((value) =>
				set.add(value),
			);
			continue;
		}
		const preset = TOKEN_PRESETS.find((token) => token.value === selection);
		if (!preset) continue;
		const mint = ensure(
			await p.text({
				message: `Mint address for ${preset.label}`,
				initialValue: preset.mint,
				validate: validatePubkey,
			}),
		).trim();
		set.add(mint);
	}
	return Array.from(set);
}

async function resolvePrograms(selections: string[], existing: string[] = []) {
	const set = new Set(existing);
	for (const selection of selections) {
		if (selection === "__custom__") {
			(await collectCustomEntries("program id")).forEach((value) =>
				set.add(value),
			);
			continue;
		}
		const preset = PROGRAM_PRESETS.find(
			(program) => program.value === selection,
		);
		if (!preset) continue;
		const programId = ensure(
			await p.text({
				message: `Program ID for ${preset.label}`,
				initialValue: preset.programId,
				validate: validatePubkey,
			}),
		).trim();
		set.add(programId);
	}
	return Array.from(set);
}

async function collectAirdrops(
	existing: Array<{ address: string; amountSol: number }>,
) {
	const entries: Array<{ address: string; amountSol: number }> = [];
	if (existing.length > 0) {
		const keep = await p.confirm({
			message: `Keep existing airdrop recipients (${existing.length})?`,
			initialValue: true,
		});
		if (p.isCancel(keep)) cancelSetup();
		if (keep) entries.push(...existing);
	}

	while (true) {
		const address = await p.text({
			message:
				entries.length === 0
					? "Airdrop recipient address (leave blank to skip)"
					: "Add another airdrop recipient (leave blank to finish)",
		});
		if (p.isCancel(address)) cancelSetup();
		const trimmed = typeof address === "string" ? address.trim() : "";
		if (!trimmed) break;
		const error = validatePubkey(trimmed);
		if (error) {
			p.log.error(error);
			continue;
		}
		const amount = ensure(
			await p.text({
				message: `Amount of SOL to airdrop to ${trimmed}`,
				initialValue: "100",
				validate: validatePositiveNumber,
			}),
		);
		entries.push({ address: trimmed, amountSol: Number(amount) });
	}

	return entries;
}
