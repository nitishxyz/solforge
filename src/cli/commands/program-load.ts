import * as p from "@clack/prompts";
import { Connection, PublicKey } from "@solana/web3.js";
import { readConfig } from "../../config";
import { parseFlags } from "../utils/args";

export async function programLoadCommand(args: string[]) {
	const { flags, rest } = parseFlags(args);
	const programId = (rest[0] as string) || (flags["program"] as string);
	const fromFile = flags["file"] as string | undefined;
	const endpoint = flags["endpoint"] as string | undefined;
	if (!programId) {
		p.log.error(
			"Usage: solforge program load <programId> [--file PATH | --endpoint URL]",
		);
		return;
	}
	let base64: string | undefined;
	try {
		if (fromFile) {
			const bytes = await Bun.file(fromFile).arrayBuffer();
			base64 = Buffer.from(bytes).toString("base64");
		} else if (endpoint) {
			// Fetch ProgramData from endpoint
			const conn = new Connection(endpoint, "confirmed");
			const pid = new PublicKey(programId);
			const info = await conn.getAccountInfo(pid, "confirmed");
			if (!info) throw new Error("Program account not found on endpoint");
			// Program account should be upgradeable; fetch ProgramData and extract bytes after header
			// Heuristic: delegate parsing to server if unsure. Here, try raw first.
			base64 = Buffer.from(info.data as Buffer).toString("base64");
		} else {
			p.log.error("Either --file or --endpoint must be provided");
			return;
		}
	} catch (e) {
		p.log.error(`Failed to read ELF: ${String(e)}`);
		return;
	}

	const cfg = await readConfig();
	const url = `http://localhost:${cfg.server.rpcPort}`;
	const s = p.spinner();
	s.start("Loading program into LiteSVM...");
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "solforgeLoadProgram",
				params: [programId, base64],
			}),
		});
		const json = await res.json();
		if (json.error)
			throw new Error(json.error.message || "program load failed");
		s.stop("Program loaded");
		console.log(JSON.stringify(json.result, null, 2));
	} catch (e) {
		s.stop("Load failed");
		p.log.error(String(e));
	}
}
