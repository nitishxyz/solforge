import * as p from "@clack/prompts";
import { readConfig } from "../../config";
import { parseFlags } from "../utils/args";

// Create a new local SPL mint with given decimals and (optional) owner authority.
// Also optionally create the owner's ATA with a starting balance (base units or UI amount).
// Usage:
//   solforge token create --decimals <d> --owner <pubkey> [--mint <pubkey>] [--amount <baseUnits> | --ui-amount <num>]
export async function tokenCreateCommand(args: string[]) {
	const { flags } = parseFlags(args);
	const decimals = flags.decimals ? Number(flags.decimals) : NaN;
	const owner = flags.owner as string | undefined;
	const mint = flags.mint as string | undefined;
	const amountBase = flags.amount as string | undefined;
	const uiAmount = flags["ui-amount"] as string | undefined;

	if (!Number.isFinite(decimals)) {
		p.log.error("--decimals is required (0-18)");
		return;
	}
	if (!owner) {
		p.log.error("--owner <pubkey> is required");
		return;
	}

	const cfg = await readConfig();
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Creating mint...");
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeCreateMint",
				params: [mint ?? null, Number(decimals), owner],
			}),
		});
		const json = await res.json();
		if (json.error) throw new Error(json.error.message || "create mint failed");
		const createdMint = json.result.mint as string;

		if (amountBase || uiAmount) {
			s.message("Creating owner ATA with balance...");
			const base =
				amountBase ??
				(uiAmount ? toBaseUnits(uiAmount, Number(decimals)) : undefined);
			const res2 = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 2,
					method: "solforgeCreateTokenAccount",
					params: [createdMint, owner, String(base)],
				}),
			});
			const json2 = await res2.json();
			if (json2.error)
				throw new Error(json2.error.message || "create token account failed");
			s.stop("Token created");
			console.log(
				JSON.stringify({ mint: json.result, account: json2.result }, null, 2),
			);
			return;
		}
		s.stop("Mint created");
		console.log(JSON.stringify(json.result, null, 2));
	} catch (e) {
		s.stop("Create failed");
		p.log.error(String(e));
	}
}

function toBaseUnits(ui: string, decimals: number): string {
	const [i, f = ""] = String(ui).split(".");
	const frac = (f + "0".repeat(decimals)).slice(0, decimals);
	return BigInt(i + (decimals ? frac : "")).toString();
}
