import * as p from "@clack/prompts";
import { readConfig, writeConfig } from "../../config";
import { parseFlags } from "../utils/args";

export async function programCloneCommand(args: string[]) {
	const { flags, rest } = parseFlags(args);
	const programId = (
		(rest[0] as string) ||
		(flags["program"] as string) ||
		""
	).trim();
	const configPath = flags["config"] as string | undefined;
	const cfg = await readConfig(configPath);
	const endpoint = (flags["endpoint"] as string) || cfg.clone.endpoint;
	const withAccounts = !!flags["with-accounts"];
	const accountsLimit = flags["accounts-limit"]
		? Number(flags["accounts-limit"])
		: undefined;
	if (!programId) {
		p.log.error(
			"Usage: solforge program clone <programId> [--endpoint URL] [--with-accounts] [--accounts-limit N]",
		);
		return;
	}
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Cloning program...");
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeAdminCloneProgram",
				params: [programId, { endpoint, withAccounts, accountsLimit }],
			}),
		});
		const json = await res.json();
		if (json.error) {
			const details = json.error.data
				? `\nDetails: ${JSON.stringify(json.error.data)}`
				: "";
			throw new Error((json.error.message || "program clone failed") + details);
		}
		s.stop("Program cloned");
		console.log(JSON.stringify(json.result, null, 2));
		await recordProgramClone(configPath, programId);
	} catch (e) {
		s.stop("Clone failed");
		p.log.error(String(e));
	}
}

export async function programAccountsCloneCommand(args: string[]) {
	const { flags, rest } = parseFlags(args);
	const programId = (
		(rest[0] as string) ||
		(flags["program"] as string) ||
		""
	).trim();
	const configPath = flags["config"] as string | undefined;
	const cfg = await readConfig(configPath);
	const endpoint = (flags["endpoint"] as string) || cfg.clone.endpoint;
	const limit = flags["limit"] ? Number(flags["limit"]) : undefined;
	const filters = flags["filters"]
		? safeJson(flags["filters"] as string)
		: undefined;
	if (!programId) {
		p.log.error(
			"Usage: solforge program accounts clone <programId> [--endpoint URL] [--limit N] [--filters JSON]",
		);
		return;
	}
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Cloning program accounts...");
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeAdminCloneProgramAccounts",
				params: [programId, { endpoint, limit, filters }],
			}),
		});
		const json = await res.json();
		if (json.error)
			throw new Error(json.error.message || "program accounts clone failed");
		s.stop("Program accounts cloned");
		console.log(JSON.stringify(json.result, null, 2));
	} catch (e) {
		s.stop("Clone failed");
		p.log.error(String(e));
	}
}

function safeJson(s: string): any {
	try {
		return JSON.parse(s);
	} catch {
		return undefined;
	}
}

async function recordProgramClone(
	configPath: string | undefined,
	programId: string,
) {
	try {
		const cfg = await readConfig(configPath);
		const next = new Set(cfg.clone.programs ?? []);
		if (!next.has(programId)) {
			next.add(programId);
			cfg.clone.programs = Array.from(next);
			await writeConfig(cfg, configPath ?? "sf.config.json");
			p.log.info(`Added ${programId} to clone programs in config`);
		}
	} catch (error) {
		console.warn(`[config] Failed to update clone programs: ${String(error)}`);
	}
}
