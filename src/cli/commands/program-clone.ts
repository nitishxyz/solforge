import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";

export async function programCloneCommand(args: string[]) {
  const { flags, rest } = parseFlags(args);
  const programId = rest[0] || (flags["program"] as string);
  const endpoint = (flags["endpoint"] as string) || (await readConfig()).clone.endpoint;
  const withAccounts = !!flags["with-accounts"];
  const accountsLimit = flags["accounts-limit"] ? Number(flags["accounts-limit"]) : undefined;
  if (!programId) {
    p.log.error("Usage: solforge program clone <programId> [--endpoint URL] [--with-accounts] [--accounts-limit N]");
    return;
  }
  const cfg = await readConfig();
  const url = `http://localhost:${cfg.server.rpcPort}`;
  const s = p.spinner(); s.start("Cloning program...");
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "solforgeAdminCloneProgram", params: [programId, { endpoint, withAccounts, accountsLimit }]
    }) });
    const json = await res.json();
    if (json.error) {
      const details = json.error.data ? `\nDetails: ${JSON.stringify(json.error.data)}` : "";
      throw new Error((json.error.message || "program clone failed") + details);
    }
    s.stop("Program cloned");
    console.log(JSON.stringify(json.result, null, 2));
  } catch (e) {
    s.stop("Clone failed");
    p.log.error(String(e));
  }
}

export async function programAccountsCloneCommand(args: string[]) {
  const { flags, rest } = parseFlags(args);
  const programId = rest[0] || (flags["program"] as string);
  const endpoint = (flags["endpoint"] as string) || (await readConfig()).clone.endpoint;
  const limit = flags["limit"] ? Number(flags["limit"]) : undefined;
  const filters = flags["filters"] ? safeJson(flags["filters"] as string) : undefined;
  if (!programId) {
    p.log.error("Usage: solforge program accounts clone <programId> [--endpoint URL] [--limit N] [--filters JSON]");
    return;
  }
  const cfg = await readConfig();
  const url = `http://localhost:${cfg.server.rpcPort}`;
  const s = p.spinner(); s.start("Cloning program accounts...");
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "solforgeAdminCloneProgramAccounts", params: [programId, { endpoint, limit, filters }]
    }) });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "program accounts clone failed");
    s.stop("Program accounts cloned");
    console.log(JSON.stringify(json.result, null, 2));
  } catch (e) {
    s.stop("Clone failed");
    p.log.error(String(e));
  }
}

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}
