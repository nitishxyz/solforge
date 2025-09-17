import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface SolforgeConfig {
	server: {
		rpcPort: number;
		wsPort: number;
		db: { mode: "ephemeral" | "persistent"; path: string };
	};
	svm: { initialLamports: string; faucetSOL: number };
	clone: {
		endpoint: string;
		programs: string[];
		tokens: string[];
		programAccounts: Array<{
			programId: string;
			limit?: number;
			filters?: unknown[];
		}>;
	};
	gui: { enabled: boolean; port: number };
	bootstrap: {
		airdrops: Array<{ address: string; amountSol: number }>;
	};
}

export const defaultConfig: SolforgeConfig = {
	server: {
		rpcPort: 8899,
		wsPort: 8900,
		db: { mode: "ephemeral", path: ".solforge/db.db" },
	},
	svm: { initialLamports: "1000000000000000", faucetSOL: 1000 },
	clone: {
		endpoint: "https://api.mainnet-beta.solana.com",
		programs: [],
		tokens: [],
		programAccounts: [],
	},
	gui: { enabled: true, port: 42069 },
	bootstrap: { airdrops: [] },
};

export async function readConfig(path?: string): Promise<SolforgeConfig> {
	const p = path || "sf.config.json";
	try {
		const t = await Bun.file(p).text();
		const json = JSON.parse(t);
		return deepMerge(defaultConfig, json);
	} catch {
		return defaultConfig;
	}
}

export async function writeDefaultConfig(opts: { force?: boolean } = {}) {
	const p = "sf.config.json";
	try {
		if (!opts.force)
			await Bun.file(p)
				.text()
				.then(() => {
					throw new Error("exists");
				});
	} catch {}
	const dir = dirname(p);
	if (dir && dir !== ".") {
		try {
			mkdirSync(dir, { recursive: true });
		} catch {}
	}
	writeFileSync(p, JSON.stringify(defaultConfig, null, 2) + "\n");
}

export async function writeConfig(
	config: SolforgeConfig,
	path = "sf.config.json",
) {
	const dir = dirname(path);
	if (dir && dir !== ".") {
		try {
			mkdirSync(dir, { recursive: true });
		} catch {}
	}
	await Bun.write(path, JSON.stringify(config, null, 2) + "\n");
}

export function getConfigValue(cfg: any, path?: string) {
	if (!path) return cfg;
	return path.split(".").reduce((o, k) => (o ? o[k] : undefined), cfg);
}

export function setConfigValue<T extends Record<string, any>>(
	cfg: T,
	path: string,
	value: any,
): T {
	const parts = path.split(".");
	let node: any = cfg;
	for (let i = 0; i < parts.length - 1; i++) {
		const k = parts[i];
		if (!node[k] || typeof node[k] !== "object") node[k] = {};
		node = node[k];
	}
	node[parts[parts.length - 1]] = coerceValue(value);
	return cfg;
}

function coerceValue(v: any) {
	if (v === "true") return true;
	if (v === "false") return false;
	if (v !== "" && !isNaN(Number(v))) return Number(v);
	try {
		return JSON.parse(v);
	} catch {
		return v;
	}
}

function deepMerge<T>(a: T, b: Partial<T>): T {
	if (Array.isArray(a) || Array.isArray(b)) return (b as any) ?? (a as any);
	if (typeof a === "object" && typeof b === "object" && a && b) {
		const out: any = { ...a };
		for (const [k, v] of Object.entries(b)) {
			const ak = (a as any)[k];
			out[k] = deepMerge(ak, v as any);
		}
		return out;
	}
	return (b as any) ?? (a as any);
}
