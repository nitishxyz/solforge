import type { Server } from "bun";
import type { LiteSVMRpcServer } from "./rpc-server";

type Sub = { id: number; type: "signature"; signature: string };

export function createLiteSVMWebSocketServer(
	rpcServer: LiteSVMRpcServer,
	port: number = 8900,
) {
	let nextSubId = 1;
	const subs = new Map<number, Sub>();

	const sockets = new Set<WebSocket>();
	const pendingChecks = new Map<string, number>();

	const sendSignatureNotification = (sig: string, slot: number, err: any) => {
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
					sockets.forEach((s) =>
						s.send(
							JSON.stringify({
								...payload,
								params: { ...payload.params, subscription: id },
							}),
						),
					);
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

	const unsubscribe = rpcServer.onSignatureRecorded(notifySignature);

	const server: Server = Bun.serve({
		port,
		fetch(req, srv) {
			if (srv.upgrade(req)) return undefined as any;
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
					} = msg as { id: number; method: string; params?: any[] };
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
					// Stub other subs to succeed without notifications
					if (
						method === "logsSubscribe" ||
						method === "slotSubscribe" ||
						method === "programSubscribe" ||
						method === "blockSubscribe"
					) {
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
				} catch (e) {
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

	console.log(`📣 LiteSVM RPC PubSub running on ws://localhost:${port}`);
	return {
		wsServer: server,
		stop: () => {
			unsubscribe();
			server.stop(true);
		},
	};
}
