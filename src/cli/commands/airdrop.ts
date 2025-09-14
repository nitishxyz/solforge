import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";

export async function airdropCommand(args: string[]) {
  const { flags } = parseFlags(args);
  const to = String(flags["to"] || "");
  const sol = Number(flags["sol"] || 0);
  const cfg = await readConfig();
  const url = `http://localhost:${cfg.server.rpcPort}`;
  if (!to || !sol) {
    p.log.error("Usage: solforge airdrop --to <pubkey> --sol <amount>");
    return;
  }
  const lamports = BigInt(Math.floor(sol * 1_000_000_000));
  const body = { jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [to, Number(lamports)] };
  const s = p.spinner(); s.start("Requesting airdrop...");
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    s.stop("Airdrop requested");
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    s.stop("Airdrop failed");
    p.log.error(String(e));
  }
}

