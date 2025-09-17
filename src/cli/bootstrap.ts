import * as p from "@clack/prompts";
import { defaultConfig, type SolforgeConfig } from "../config";

export async function bootstrapEnvironment(
  config: SolforgeConfig,
  host: string,
  rpcPort: number,
) {
  const url = `http://${host}:${rpcPort}`;
  const endpoint = config.clone.endpoint || defaultConfig.clone.endpoint;

  for (const mint of config.clone.tokens || []) {
    await withSpinner(`Cloning token ${mint}`, async () => {
      await callRpc(url, "solforgeAdminCloneTokenMint", [mint, { endpoint }]);
      await callRpc(url, "solforgeAdoptMintAuthority", [mint]);
    });
  }

  for (const programId of config.clone.programs || []) {
    await withSpinner(`Cloning program ${programId}`, async () => {
      await callRpc(url, "solforgeAdminCloneProgram", [programId, { endpoint }]);
    });
  }

  for (const { address, amountSol } of config.bootstrap?.airdrops || []) {
    await withSpinner(`Airdropping ${amountSol} SOL to ${address}`, async () => {
      const lamports = Math.round(amountSol * 1_000_000_000);
      await callRpc(url, "requestAirdrop", [address, lamports]);
    });
  }
}

async function withSpinner(task: string, action: () => Promise<void>) {
  const spin = p.spinner();
  spin.start(`${task}...`);
  try {
    await action();
    spin.stop(`${task} done`);
  } catch (error) {
    spin.stop(`${task} failed`);
    p.log.error(String(error));
  }
}

async function callRpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) {
    const message = json.error?.message || `${method} failed`;
    const detail = json.error?.data ? `: ${JSON.stringify(json.error.data)}` : "";
    throw new Error(message + detail);
  }
  return json.result;
}
