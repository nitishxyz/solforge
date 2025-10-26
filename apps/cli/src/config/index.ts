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
	agi?: {
		enabled: boolean;
		port: number;
		host: string;
		domain?: string;
		corsOrigins?: string[];
		provider?: "openrouter" | "anthropic" | "openai";
		model?: string;
		apiKey?: string;
		agent: "general" | "build";
	};
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
	agi: {
		enabled: true,
		port: 3456,
		host: "127.0.0.1",
		agent: "general",
	},
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
	writeFileSync(p, `${JSON.stringify(defaultConfig, null, 2)}\n`);
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
	await Bun.write(path, `${JSON.stringify(config, null, 2)}\n`);
}

export function getConfigValue(
	cfg: Record<string, unknown>,
	path?: string,
): unknown {
	if (!path) return cfg;
	let cur: unknown = cfg;
	for (const k of path.split(".")) {
		if (
			cur &&
			typeof cur === "object" &&
			k in (cur as Record<string, unknown>)
		) {
			cur = (cur as Record<string, unknown>)[k];
		} else {
			return undefined;
		}
	}
	return cur;
}

export function setConfigValue<T extends Record<string, unknown>>(
	cfg: T,
	path: string,
	value: unknown,
): T {
	const parts = path.split(".");
	let node: Record<string, unknown> = cfg;
	for (let i = 0; i < parts.length - 1; i++) {
		const k = parts[i];
		if (!node[k] || typeof node[k] !== "object") node[k] = {};
		node = node[k] as Record<string, unknown>;
	}
	node[parts[parts.length - 1]] = coerceValue(value);
	return cfg;
}

function coerceValue(v: unknown): unknown {
	if (v === "true") return true;
	if (v === "false") return false;
	if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)))
		return Number(v);
	try {
		return typeof v === "string" ? JSON.parse(v) : v;
	} catch {
		return v;
	}
}

function deepMerge<T>(a: T, b: Partial<T>): T {
	if (Array.isArray(a) || Array.isArray(b)) return (b ?? a) as unknown as T;
	if (typeof a === "object" && typeof b === "object" && a && b) {
		const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
		for (const [k, v] of Object.entries(b)) {
			const ak = (a as Record<string, unknown>)[k];
			out[k] = deepMerge(ak as unknown, v as unknown) as unknown;
		}
		return out as unknown as T;
	}
	return (b ?? a) as unknown as T;
}
