import {
	createLiteSVMRpcServer,
	createLiteSVMWebSocketServer,
} from "../../server";
import { startGuiServer } from "../gui/server";

export interface RpcStartOptions {
	rpcPort?: number;
	wsPort?: number;
	dbMode?: "ephemeral" | "persistent";
	dbPath?: string;
	host?: string;
	guiEnabled?: boolean;
	guiPort?: number;
}

export function startRpcServers(opts: RpcStartOptions = {}) {
	const rpcPort = Number(opts.rpcPort ?? (process.env.RPC_PORT || 8899));
	const wsPort = Number(opts.wsPort ?? rpcPort + 1);
	const host = String(opts.host ?? process.env.RPC_HOST ?? "127.0.0.1");
	const guiEnabled = opts.guiEnabled !== false;
	const guiPort = Number(
		opts.guiPort ?? process.env.SOLFORGE_GUI_PORT ?? 42069,
	);

	if (opts.dbMode) process.env.SOLFORGE_DB_MODE = opts.dbMode;
	if (opts.dbPath) process.env.SOLFORGE_DB_PATH = opts.dbPath;

	const { httpServer, rpcServer } = createLiteSVMRpcServer(rpcPort, host);
	const { wsServer } = createLiteSVMWebSocketServer(rpcServer, wsPort);
	const guiServer = guiEnabled
		? startGuiServer({ port: guiPort, host, rpcPort, rpcServer })
		: null;

	return {
		httpServer,
		rpcServer,
		wsServer,
		rpcPort,
		wsPort,
		guiPort: guiServer ? guiServer.port : null,
		guiServer,
	};
}
