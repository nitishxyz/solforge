import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";
// No network fetch; decimals are read from LiteSVM via RPC getTokenSupply

// Create/overwrite a token account (ATA) with a specified amount (base units)
// Usage: solforge mint --mint <mint> --to <owner> --amount <amount>
export async function mintCommand(args: string[]) {
  const { flags } = parseFlags(args);
  let mint = flags["mint"] as string | undefined;
  let receiver = flags["to"] as string | undefined; // required: receiver address (ATA owner)
  let amountBase = flags["amount"] as string | undefined; // optional direct base-units
  let uiAmount = flags["ui-amount"] as string | undefined; // preferred UI units

  const cfg = await readConfig();
  const url = `http://localhost:${cfg.server.rpcPort}`;

  // Get known mints from server for selection
  let knownMints: string[] = [];
  try {
    const resList = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "solforgeListMints", params: [] }) });
    const j = await resList.json();
    if (!j.error && Array.isArray(j.result)) knownMints = j.result;
  } catch {}

  if (!mint) {
    if (knownMints.length > 0) {
      const choice = (await p.select({ message: "Select mint", options: knownMints.map(m => ({ value: m, label: m })) })) as string | symbol | null;
      if (!choice || typeof choice !== "string") return;
      mint = choice;
    } else {
      p.log.error("No known mints. Clone or create a token first.");
      return;
    }
  }

  // Receiver (ATA owner) is required
  if (!receiver) {
    receiver = (await p.text({ message: "Receiver public key (ATA owner)", placeholder: "<receiver public key>", validate: (v) => (v && v.length >= 32 ? undefined : "Enter a valid public key") })) as string;
    if (!receiver) return;
  }

  // Amount selection (prefer UI units)
  if (!amountBase && !uiAmount) {
    uiAmount = (await p.text({ message: "Amount (UI units)", placeholder: "1000", validate: (v) => (v && !Number.isNaN(Number(v)) ? undefined : "Enter a number") })) as string;
    if (!uiAmount) return;
  }

  // If UI amount provided, get decimals from LiteSVM via getTokenSupply
  if (!amountBase && uiAmount) {
    let decimals = 0;
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getTokenSupply", params: [mint] }) });
      const j = await res.json();
      const d = j?.result?.value?.decimals ?? j?.result?.decimals;
      if (typeof d === "number") decimals = d;
    } catch {}
    amountBase = toBaseUnits(uiAmount, decimals);
  }

  const s = p.spinner();
  s.start("Minting via real transaction...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "solforgeMintTo", params: [mint, receiver, amountBase] }),
    });
    const json = await res.json();
    if (json.error) {
      const msg = String(json.error.message || "mint failed");
      // Offer admin fallback when faucet is not mint authority
      if (/no faucet authority|authority/i.test(msg)) {
        const choice = (await p.select({
          message: "Mint authority is not faucet. Choose action:",
          options: [
            { value: "adopt", label: "Adopt faucet as authority (local) and mint (real tx)" },
            { value: "admin", label: "Admin set-balance (no real tx)" },
            { value: "cancel", label: "Cancel" },
          ],
        })) as "adopt" | "admin" | "cancel" | symbol | null;
        if (!choice || choice === "cancel") throw new Error(msg);
        if (choice === "adopt") {
          s.message("Adopting faucet as authority...");
          const resAdopt = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "solforgeAdoptMintAuthority", params: [mint] }) });
          const jA = await resAdopt.json();
          if (jA.error) throw new Error(jA.error.message || "adopt authority failed");
          s.message("Minting via real transaction...");
          const resRetry = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "solforgeMintTo", params: [mint, receiver, amountBase] }) });
          const jR = await resRetry.json();
          if (jR.error) throw new Error(jR.error.message || "mint failed");
          s.stop("Minted");
          console.log(JSON.stringify(jR.result, null, 2));
          return;
        }
        if (choice === "admin") {
          const res2 = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "solforgeCreateTokenAccount", params: [mint, receiver, amountBase] }),
          });
          const json2 = await res2.json();
          if (json2.error) throw new Error(json2.error.message || "admin mint failed");
          s.stop("Minted (admin)");
          console.log(JSON.stringify(json2.result, null, 2));
          return;
        }
      }
      throw new Error(msg);
    }
    s.stop("Minted");
    console.log(JSON.stringify(json.result, null, 2));
  } catch (e) {
    s.stop("Mint failed");
    p.log.error(String(e));
  }
}

function toBaseUnits(ui: string, decimals: number): string {
  const [i, f = ""] = String(ui).split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(i + (decimals ? frac : "")).toString();
}
