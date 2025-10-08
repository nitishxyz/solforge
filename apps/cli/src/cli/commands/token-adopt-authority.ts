import * as p from "@clack/prompts";
import { readConfig } from "../../config";
import { parseFlags } from "../utils/args";

// Set the faucet as mint authority for an existing mint in LiteSVM (local-only)
export async function tokenAdoptAuthorityCommand(args: string[]) {
	const { flags, rest } = parseFlags(args);
	const mint = (rest[0] as string) || (flags.mint as string);
	if (!mint) {
		p.log.error("Usage: solforge token adopt-authority <mint>");
		return;
	}
	const cfg = await readConfig();
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Adopting faucet as mint authority...");
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeAdoptMintAuthority",
				params: [mint],
			}),
		});
		const json = await res.json();
		if (json.error)
			throw new Error(json.error.message || "adopt authority failed");
		s.stop("Authority updated");
		console.log(JSON.stringify(json.result, null, 2));
	} catch (e) {
		s.stop("Failed");
		p.log.error(String(e));
	}
}
