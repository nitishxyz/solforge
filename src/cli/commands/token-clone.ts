import * as p from "@clack/prompts";
import { readConfig, writeConfig } from "../../config";
import { parseFlags } from "../utils/args";

// Simplified token "clone": create an ATA locally with the requested amount.
// Usage:
//   solforge token clone <mint> --to <owner> --amount <baseUnits>
//   solforge token clone <mint> --to <owner> --ui-amount <num> --decimals <d>
export async function tokenCloneCommand(args: string[]) {
	const { flags, rest } = parseFlags(args);
	const mint = ((rest[0] as string) || (flags["mint"] as string) || "").trim();
	if (!mint) {
		p.log.error(
			"Usage: solforge token clone <mint> [--amount <baseUnits> | --ui-amount <num>] [--endpoint URL]",
		);
		return;
	}

	const owner = flags["to"] as string | undefined; // optional; defaults to faucet on server
	const configPath = flags["config"] as string | undefined;
	const cfg = await readConfig(configPath);
	const endpoint = (flags["endpoint"] as string) || cfg.clone.endpoint;
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Cloning mint into LiteSVM...");
	try {
		// First, mirror the mint account so downstream reads work
		const resMint = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeAdminCloneTokenMint",
				params: [mint, { endpoint }],
			}),
		});
		const jsonMint = await resMint.json();
		if (jsonMint.error) {
			const data = jsonMint.error.data
				? `\nDetails: ${JSON.stringify(jsonMint.error.data)}`
				: "";
			throw new Error((jsonMint.error.message || "clone mint failed") + data);
		}
		// Record mint in config immediately after a successful clone
		await recordTokenClone(configPath, mint);
		// Try to adopt faucet as mint authority for local usage (do not fail the command if this step fails)
		try {
			s.message("Adopting faucet as authority...");
			const resAdopt = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 3,
					method: "solforgeAdoptMintAuthority",
					params: [mint],
				}),
			});
			const jsonAdopt = await resAdopt.json();
			if (jsonAdopt.error) {
				p.log.warn(jsonAdopt.error.message || "adopt authority failed");
				s.stop("Mint cloned (authority unchanged)");
				console.log(
					JSON.stringify({ mint: jsonMint.result, adopt: null }, null, 2),
				);
				return;
			}
			s.stop("Mint cloned and authority adopted");
			console.log(
				JSON.stringify(
					{ mint: jsonMint.result, adopt: jsonAdopt.result },
					null,
					2,
				),
			);
			return;
		} catch (adoptErr: any) {
			p.log.warn(
				`Adopt authority failed: ${adoptErr?.message || String(adoptErr)}`,
			);
			s.stop("Mint cloned (authority unchanged)");
			console.log(
				JSON.stringify({ mint: jsonMint.result, adopt: null }, null, 2),
			);
			return;
		}
		return;
	} catch (e) {
		s.stop("Clone failed");
		p.log.error(String(e));
		p.log.info(
			"Token clone mirrors an on-chain mint and requires network access to --endpoint. For an offline token, use 'solforge token create'.",
		);
	}
}

// intentionally no UI conversion here; clone mirrors the on-chain mint only

async function recordTokenClone(configPath: string | undefined, mint: string) {
	try {
		const cfg = await readConfig(configPath);
		const next = new Set(cfg.clone.tokens ?? []);
		if (!next.has(mint)) {
			next.add(mint);
			cfg.clone.tokens = Array.from(next);
			await writeConfig(cfg, configPath ?? "sf.config.json");
			p.log.info(`Added ${mint} to clone tokens in config`);
		}
	} catch (error) {
		console.warn(`[config] Failed to update clone tokens: ${String(error)}`);
	}
}
