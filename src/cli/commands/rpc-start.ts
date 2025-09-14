import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";
import { startRpcServers } from "../../rpc/start";

export async function rpcStartCommand(args: string[]) {
  const { flags } = parseFlags(args);
  const cfg = await readConfig(flags["config"] as string | undefined);
  const rpcPort = Number(flags["port"] ?? cfg.server.rpcPort ?? 8899);
  const wsPort = Number(flags["ws-port"] ?? cfg.server.wsPort ?? rpcPort + 1);
  const dbMode = (flags["db-mode"] as string) || cfg.server.db.mode || "ephemeral";
  const dbPath = (flags["db-path"] as string) || cfg.server.db.path || ".solforge/db.db";

  const s = p.spinner();
  s.start(`Starting RPC on ${rpcPort}, WS on ${wsPort}...`);
  try {
    const started = startRpcServers({ rpcPort, wsPort, dbMode: dbMode as any, dbPath });
    s.stop("RPC started");
    console.log(`HTTP: http://localhost:${started.rpcPort}`);
    console.log(`WS:   ws://localhost:${started.wsPort}`);
  } catch (e) {
    s.stop("Failed to start RPC");
    p.log.error(String(e));
    process.exitCode = 1;
  }
}

