import * as p from "@clack/prompts";
import { parseFlags } from "../utils/args";
import { readConfig } from "../../config";
import { startRpcServers } from "../../rpc/start";

export async function rpcStartCommand(args: string[]) {
  const { flags } = parseFlags(args);
  const cfg = await readConfig(flags["config"] as string | undefined);
  const rpcPort = Number(flags["port"] ?? cfg.server.rpcPort ?? 8899);
  const wsPort = Number(flags["ws-port"] ?? cfg.server.wsPort ?? rpcPort + 1);
  const host = (flags["host"] as string) || "127.0.0.1";
  const dbMode = (flags["db-mode"] as string) || cfg.server.db.mode || "ephemeral";
  const dbPath = (flags["db-path"] as string) || cfg.server.db.path || ".solforge/db.db";
  const guiPort = Number(flags["gui-port"] ?? cfg.gui.port ?? 42069);
  const guiEnabled = flags["no-gui"] === true ? false : (flags["gui"] === true ? true : cfg.gui.enabled !== false);

  const s = p.spinner();
  const guiMsg = guiEnabled ? `, GUI on ${guiPort}` : "";
  s.start(`Starting RPC on ${host}:${rpcPort}, WS on ${wsPort}${guiMsg}...`);
  try {
    const started = startRpcServers({
      rpcPort,
      wsPort,
      dbMode: dbMode as any,
      dbPath,
      host,
      guiEnabled,
      guiPort,
    });
    s.stop("RPC started");
    console.log(`HTTP: http://${host}:${started.rpcPort}`);
    console.log(`WS:   ws://${host}:${started.wsPort}`);
    if (started.guiPort) console.log(`GUI:  http://${host}:${started.guiPort}`);
  } catch (e) {
    s.stop("Failed to start RPC");
    p.log.error(String(e));
    process.exitCode = 1;
  }
}
