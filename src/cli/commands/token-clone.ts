import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";
import { Connection, PublicKey } from "@solana/web3.js";
import { MintLayout } from "@solana/spl-token";

// Simplified token "clone": create an ATA locally with the requested amount.
// Usage:
//   solforge token clone <mint> --to <owner> --amount <baseUnits>
//   solforge token clone <mint> --to <owner> --ui-amount <num> --decimals <d>
export async function tokenCloneCommand(args: string[]) {
  const { flags, rest } = parseFlags(args);
  const mint = (rest[0] as string) || (flags["mint"] as string);
  if (!mint) {
    p.log.error("Usage: solforge token clone <mint> [--amount <baseUnits> | --ui-amount <num>] [--endpoint URL]");
    return;
  }

  const owner = flags["to"] as string | undefined; // optional; defaults to faucet on server
  const endpoint = (flags["endpoint"] as string) || (await readConfig()).clone.endpoint;

  const cfg = await readConfig();
  const url = `http://localhost:${cfg.server.rpcPort}`;
  const s = p.spinner(); s.start("Cloning mint into LiteSVM...");
  try {
    // First, mirror the mint account so downstream reads work
    const resMint = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "solforgeAdminCloneTokenMint", params: [mint, { endpoint }] }),
    });
    const jsonMint = await resMint.json();
    if (jsonMint.error) {
      const data = jsonMint.error.data ? `\nDetails: ${JSON.stringify(jsonMint.error.data)}` : "";
      throw new Error((jsonMint.error.message || "clone mint failed") + data);
    }
    // Optionally adopt faucet as authority for local testing
    const adopt = flags["adopt-authority"] ? true : await p.confirm({ message: "Set faucet as mint authority locally?", initialValue: true });
    if (adopt) {
      s.message("Adopting faucet as authority...");
      const resAdopt = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "solforgeAdoptMintAuthority", params: [mint] }),
      });
      const jsonAdopt = await resAdopt.json();
      if (jsonAdopt.error) throw new Error(jsonAdopt.error.message || "adopt authority failed");
      s.stop("Mint cloned and authority adopted");
      console.log(JSON.stringify({ mint: jsonMint.result, adopt: jsonAdopt.result }, null, 2));
      return;
    }
    s.stop("Mint cloned");
    console.log(JSON.stringify({ mint: jsonMint.result }, null, 2));
    return;
  } catch (e) {
    s.stop("Clone failed");
    p.log.error(String(e));
    p.log.info("Token clone mirrors an on-chain mint and requires network access to --endpoint. For an offline token, use 'solforge token create'.");
  }
}

// intentionally no UI conversion here; clone mirrors the on-chain mint only
