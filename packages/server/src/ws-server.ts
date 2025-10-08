import type { Server } from "bun";
import type { LiteSVMRpcServer } from "./rpc-server";

type Sub =
	| { id: number; type: "signature"; signature: string }
	| {
			id: number;
			type: "logs";
			filter: "all" | "allWithVotes" | { mentions: string[] };
	  }
	| { id: number; type: "slot" }
	| { id: number; type: "program"; programId: string }
	| { id: number; type: "block" };

export function createLiteSVMWebSocketServer(
	rpcServer: LiteSVMRpcServer,
	port: number = 8900,
	host?: string,
) {
	let nextSubId = 1;
	const subs = new Map<number, Sub>();

	const sockets = new Set<WebSocket>();
	const pendingChecks = new Map<string, number>();

	const sendSignatureNotification = (
		sig: string,
		slot: number,
		err: unknown,
	) => {
		const payload = {
			jsonrpc: "2.0",
			method: "signatureNotification",
			params: {
				result: { context: { slot }, value: { err } },
			},
		} as const;
		for (const [id, sub] of subs.entries()) {
			if (sub.type === "signature" && sub.signature === sig) {
				try {
					for (const s of sockets) {
						s.send(
							JSON.stringify({
								...payload,
								params: { ...payload.params, subscription: id },
							}),
						);
					}
				} catch {}
				subs.delete(id);
			}
		}
	};

	const scheduleSignatureCheck = (sig: string) => {
		if (pendingChecks.has(sig)) return;
		pendingChecks.set(sig, 0);
		const tick = () => {
			const tries = (pendingChecks.get(sig) ?? 0) + 1;
			pendingChecks.set(sig, tries);
			const status = rpcServer.getSignatureStatus(sig);
			if (status) {
				pendingChecks.delete(sig);
				sendSignatureNotification(sig, status.slot, status.err);
				return;
			}
			if (tries < 60) {
				setTimeout(tick, 25);
			} else {
				pendingChecks.delete(sig);
			}
		};
		setTimeout(tick, 10);
	};

	const notifySignature = (sig: string) => {
		scheduleSignatureCheck(sig);
	};

	const notifyLogs = (data: {
		signature: string;
		logs: string[];
		err: unknown;
		accounts: string[];
	}) => {
		const payload = {
			jsonrpc: "2.0",
			method: "logsNotification",
			params: {
				result: {
					context: { slot: Number(rpcServer.getCurrentSlot()) },
					value: {
						signature: data.signature,
						logs: data.logs,
						err: data.err,
					},
				},
			},
		} as const;

		for (const [id, sub] of subs.entries()) {
			if (sub.type !== "logs") continue;

			let shouldNotify = false;
			if (sub.filter === "all" || sub.filter === "allWithVotes") {
				shouldNotify = true;
			} else if ("mentions" in sub.filter) {
				// Check if any account in the transaction matches the filter
				shouldNotify = data.accounts.some((acc) =>
					sub.filter.mentions.includes(acc),
				);
			}

			if (shouldNotify) {
				try {
					for (const s of sockets) {
						s.send(
							JSON.stringify({
								...payload,
								params: { ...payload.params, subscription: id },
							}),
						);
					}
				} catch {}
			}
		}
	};

	const notifySlot = () => {
		const slot = Number(rpcServer.getCurrentSlot());
		const payload = {
			jsonrpc: "2.0",
			method: "slotNotification",
			params: {
				result: {
					slot,
					parent: slot > 0 ? slot - 1 : 0,
					root: slot > 32 ? slot - 32 : 0,
				},
			},
		} as const;

		for (const [id, sub] of subs.entries()) {
			if (sub.type === "slot") {
				try {
					for (const s of sockets) {
						s.send(
							JSON.stringify({
								...payload,
								params: { ...payload.params, subscription: id },
							}),
						);
					}
				} catch {}
			}
		}
	};

	const unsubscribe = rpcServer.onSignatureRecorded(notifySignature);
	const unsubscribeLogs = rpcServer.onLogsRecorded(notifyLogs);
	const unsubscribeSlot = rpcServer.onSlotAdvanced(notifySlot);

	const server: Server = Bun.serve({
		port,
		hostname: host || process.env.RPC_HOST || "127.0.0.1",
		fetch(req, srv) {
			if (srv.upgrade(req)) return undefined as unknown as Response;
			return new Response("Not a websocket", { status: 400 });
		},
		websocket: {
			open(ws) {
				sockets.add(ws);
			},
			close(ws) {
				sockets.delete(ws);
			},
			message(ws, data) {
				try {
					const msg = JSON.parse(
						typeof data === "string"
							? data
							: Buffer.from(data as ArrayBuffer).toString("utf8"),
					);
					const {
						id,
						method,
						params = [],
					} = msg as { id: number; method: string; params?: unknown[] };
					if (method === "signatureSubscribe") {
						const [signature] = params;
						const subId = nextSubId++;
						subs.set(subId, { id: subId, type: "signature", signature });
						// Respond with subscription id
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: subId }));
						// If already have a status, notify immediately
						const status = rpcServer.getSignatureStatus(signature);
						if (status) {
							ws.send(
								JSON.stringify({
									jsonrpc: "2.0",
									method: "signatureNotification",
									params: {
										result: {
											context: { slot: status.slot },
											value: { err: status.err },
										},
										subscription: subId,
									},
								}),
							);
							subs.delete(subId);
						}
						return;
					}
					if (method === "signatureUnsubscribe") {
						const [subId] = params;
						subs.delete(subId);
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: true }));
						return;
					}
					if (method === "logsSubscribe") {
						const [filter] = params;
						const subId = nextSubId++;

						let parsedFilter: "all" | "allWithVotes" | { mentions: string[] } =
							"all";
						if (typeof filter === "string") {
							parsedFilter = filter as "all" | "allWithVotes";
						} else if (
							filter &&
							typeof filter === "object" &&
							"mentions" in filter
						) {
							parsedFilter = {
								mentions: Array.isArray(filter.mentions)
									? filter.mentions
									: [filter.mentions],
							};
						}

						subs.set(subId, { id: subId, type: "logs", filter: parsedFilter });
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: subId }));
						return;
					}
					if (method === "logsUnsubscribe") {
						const [subId] = params;
						subs.delete(subId);
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: true }));
						return;
					}
					if (method === "slotSubscribe") {
						const subId = nextSubId++;
						subs.set(subId, { id: subId, type: "slot" });
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: subId }));
						return;
					}
					if (method === "slotUnsubscribe") {
						const [subId] = params;
						subs.delete(subId);
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: true }));
						return;
					}
					// Stub other subs (program, block) to succeed without notifications
					if (method === "programSubscribe" || method === "blockSubscribe") {
						const subId = nextSubId++;
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: subId }));
						return;
					}
					if (method === "ping") {
						ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: null }));
						return;
					}
					// Method not found (ws)
					ws.send(
						JSON.stringify({
							jsonrpc: "2.0",
							id,
							error: { code: -32601, message: `Method not found: ${method}` },
						}),
					);
				} catch (_e) {
					try {
						ws.send(
							JSON.stringify({
								jsonrpc: "2.0",
								id: null,
								error: { code: -32700, message: "Parse error" },
							}),
						);
					} catch {}
				}
			},
		},
	});

	const hostname = (host || process.env.RPC_HOST || "127.0.0.1").toString();
	console.log(`📣 LiteSVM RPC PubSub running on ws://${hostname}:${port}`);
	return {
		wsServer: server,
		stop: () => {
			unsubscribe();
			unsubscribeLogs();
			unsubscribeSlot();
			server.stop(true);
		},
	};
}
