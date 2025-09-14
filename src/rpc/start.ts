import { createLiteSVMRpcServer, createLiteSVMWebSocketServer } from "../../server";

export interface RpcStartOptions {
  rpcPort?: number;
  wsPort?: number;
  dbMode?: "ephemeral" | "persistent";
  dbPath?: string;
}

export function startRpcServers(opts: RpcStartOptions = {}) {
  const rpcPort = Number(opts.rpcPort ?? (process.env.RPC_PORT || 8899));
  const wsPort = Number(opts.wsPort ?? rpcPort + 1);

  if (opts.dbMode) process.env.SOLFORGE_DB_MODE = opts.dbMode;
  if (opts.dbPath) process.env.SOLFORGE_DB_PATH = opts.dbPath;

  const { httpServer, rpcServer } = createLiteSVMRpcServer(rpcPort);
  createLiteSVMWebSocketServer(rpcServer, wsPort);

  return { httpServer, rpcServer, rpcPort, wsPort };
}

