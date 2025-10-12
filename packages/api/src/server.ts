import { serve } from "bun";
import type { JsonRpcResponse, LiteSVMRpcServer } from "@solforge/server";

export type WebAssets = {
	getAsset: (path: string) => Uint8Array | null;
	assetPaths: {
		html: string;
		assets: {
			js: string[];
			css: string[];
			other: string[];
		};
	};
};

export type ApiServerOptions = {
	port?: number;
	host?: string;
	rpcPort?: number;
	rpcServer?: LiteSVMRpcServer;
	webAssets?: WebAssets;
};

const LAMPORTS_PER_SOL = 1_000_000_000n;
const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "content-type",
	"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: unknown,
	) {
		super(message);
	}
}

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, "Content-Type": "application/json" },
	});

const text = (value: string, status = 200) =>
	new Response(value, {
		status,
		headers: { ...CORS, "Content-Type": "text/plain" },
	});

const okOptions = () => new Response(null, { status: 204, headers: CORS });

const handleError = (error: unknown) => {
	if (error instanceof HttpError)
		return json({ error: error.message, details: error.details }, error.status);
	console.error("[api] error", error);
	return json({ error: "Internal server error" }, 500);
};

const wrap =
	(handler: (req: Request) => Promise<unknown> | unknown) =>
	async (req: Request) => {
		try {
			const result = await handler(req);
			return result instanceof Response ? result : json(result);
		} catch (error) {
			return handleError(error);
		}
	};

const readJson = async <T extends Record<string, unknown>>(
	req: Request,
): Promise<T> => {
	try {
		return (await req.json()) as T;
	} catch (error) {
		throw new HttpError(400, "Invalid JSON body", { cause: error });
	}
};

const parseLamports = (payload: {
	lamports?: string | number;
	sol?: string | number;
}) => {
	if (payload.lamports != null) {
		const lamports = BigInt(payload.lamports);
		if (lamports <= 0n) throw new HttpError(400, "lamports must be positive");
		return lamports;
	}
	if (payload.sol != null) {
		const sol = Number(payload.sol);
		if (!Number.isFinite(sol) || sol <= 0)
			throw new HttpError(400, "sol must be positive");
		return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)));
	}
	throw new HttpError(400, "lamports or sol is required");
};

const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
};

function getMimeType(path: string): string {
	const ext = path.substring(path.lastIndexOf("."));
	return MIME_TYPES[ext] || "application/octet-stream";
}

export function startApiServer(opts: ApiServerOptions = {}) {
	const host = opts.host ?? "127.0.0.1";
	const port = Number(opts.port ?? 42069);
	const rpcPort = Number(opts.rpcPort ?? 8899);
	const rpcServer = opts.rpcServer;
	const rpcUrl = `http://${host}:${rpcPort}`;
	const webAssets = opts.webAssets;

	const resolveAgiServerUrl = (requestUrl: URL) => {
		const envUrl = process.env.SOLFORGE_AGI_URL;
		if (envUrl) return envUrl;
		const rawHost = process.env.SOLFORGE_AGI_HOST?.trim();
		const rawPort = process.env.SOLFORGE_AGI_PORT?.trim();
		const fallbackHost = requestUrl.hostname || host;
		const baseHost = rawHost && rawHost.length > 0 ? rawHost : fallbackHost;

		try {
			if (baseHost.includes("://")) {
				const full = new URL(baseHost);
				if (rawPort && rawPort.length > 0) {
					full.port = rawPort;
				} else if (!full.port) {
					full.port = "3456";
				}
				if (!full.protocol) full.protocol = "http:";
				return full.toString().replace(/\/$/, "");
			}

			const colonCount = (baseHost.match(/:/g) ?? []).length;
			const needsIpv6Wrapping =
				colonCount > 1 && !baseHost.startsWith("[") && !baseHost.endsWith("]");
			const hostForUrl = needsIpv6Wrapping ? `[${baseHost}]` : baseHost;
			const candidate = new URL(`http://${hostForUrl}`);
			if (rawPort && rawPort.length > 0) {
				candidate.port = rawPort;
			} else if (!candidate.port) {
				candidate.port = "3456";
			}
			return candidate.toString().replace(/\/$/, "");
		} catch {
			const safeHost = baseHost.replace(/\/$/, "");
			const portPart = rawPort && rawPort.length > 0 ? rawPort : "3456";
			return `http://${safeHost}:${portPart}`;
		}
	};

	const injectAgiServerScript = (html: string, requestUrl: URL) => {
		const agiServerUrl = resolveAgiServerUrl(requestUrl);
		const scriptTag = `<script>window.AGI_SERVER_URL = ${JSON.stringify(agiServerUrl)};</script>`;
		return html.replace("</head>", `${scriptTag}</head>`);
	};

	const callRpc = async (method: string, params: unknown[] = []) => {
		if (!rpcServer) throw new HttpError(503, "RPC server not available");
		const response: JsonRpcResponse = await rpcServer.handleRequest({
			jsonrpc: "2.0",
			id: `api-${Date.now()}`,
			method,
			params,
		});
		if (response.error)
			throw new HttpError(
				400,
				response.error.message ?? "RPC error",
				response.error,
			);
		return response.result;
	};

	const routes = {
		"/health": { GET: () => text("ok") },
		"/api/config": { GET: () => json({ rpcUrl }), OPTIONS: okOptions },
		"/api/status": {
			GET: wrap(() => callRpc("solforgeGetStatus")),
			OPTIONS: okOptions,
		},
		"/api/programs": {
			GET: wrap(() => callRpc("solforgeListPrograms")),
			OPTIONS: okOptions,
		},
		"/api/tokens": {
			GET: wrap(() => callRpc("solforgeListTokensDetailed")),
			OPTIONS: okOptions,
		},
		"/api/airdrop": {
			POST: wrap(async (req) => {
				const body = await readJson<{
					address?: string;
					lamports?: string | number;
					sol?: string | number;
				}>(req);
				const address =
					typeof body.address === "string" ? body.address.trim() : "";
				if (!address) throw new HttpError(400, "address is required");
				const lamports = parseLamports(body);
				const signature = await callRpc("requestAirdrop", [
					address,
					Number(lamports),
				]);
				return { ok: true, signature };
			}),
			OPTIONS: okOptions,
		},
		"/api/mint": {
			POST: wrap(async (req) => {
				const body = await readJson<{
					mint?: string;
					owner?: string;
					amountRaw?: string;
				}>(req);
				const mint = typeof body.mint === "string" ? body.mint.trim() : "";
				const owner = typeof body.owner === "string" ? body.owner.trim() : "";
				const amountRaw =
					typeof body.amountRaw === "string" ? body.amountRaw.trim() : "";
				if (!mint || !owner || !amountRaw)
					throw new HttpError(400, "mint, owner and amountRaw are required");
				return callRpc("solforgeMintTo", [mint, owner, amountRaw]);
			}),
			OPTIONS: okOptions,
		},
		"/api/clone/program": {
			POST: wrap(async (req) => {
				const body = await readJson<{
					programId?: string;
					endpoint?: string;
					withAccounts?: boolean;
					accountsLimit?: number;
				}>(req);
				const programId =
					typeof body.programId === "string" ? body.programId.trim() : "";
				if (!programId) throw new HttpError(400, "programId is required");
				const endpoint =
					typeof body.endpoint === "string" && body.endpoint.trim()
						? body.endpoint.trim()
						: undefined;
				const withAccounts = body.withAccounts === true;
				const accountsLimit =
					typeof body.accountsLimit === "number"
						? body.accountsLimit
						: undefined;
				return callRpc("solforgeAdminCloneProgram", [
					programId,
					{ endpoint, withAccounts, accountsLimit },
				]);
			}),
			OPTIONS: okOptions,
		},
		"/api/clone/token": {
			POST: wrap(async (req) => {
				const body = await readJson<{
					mint?: string;
					endpoint?: string;
					cloneAccounts?: boolean;
					holders?: number;
					allAccounts?: boolean;
				}>(req);
				const mint = typeof body.mint === "string" ? body.mint.trim() : "";
				if (!mint) throw new HttpError(400, "mint is required");
				const endpoint =
					typeof body.endpoint === "string" && body.endpoint.trim()
						? body.endpoint.trim()
						: undefined;
				const cloneAccounts = body.cloneAccounts === true;
				const holders =
					typeof body.holders === "number" ? body.holders : undefined;
				const allAccounts = body.allAccounts === true;
				const mintResult = await callRpc("solforgeAdminCloneTokenMint", [
					mint,
					{ endpoint },
				]);
				try {
					await callRpc("solforgeAdoptMintAuthority", [mint]);
				} catch (e) {
					console.warn("[api] adopt mint authority failed (continuing)", e);
				}
				let accountsResult: unknown = null;
				if (cloneAccounts) {
					accountsResult = await callRpc("solforgeAdminCloneTokenAccounts", [
						mint,
						{ endpoint, holders, allAccounts },
					]);
				}
				return {
					mint: mintResult,
					adoptedAuthority: true,
					accounts: accountsResult,
				};
			}),
			OPTIONS: okOptions,
		},
		"/api/transactions": {
			GET: wrap(() => callRpc("solforgeListTransactions", [50])),
			OPTIONS: okOptions,
		},
	} as const;

	const decoder = new TextDecoder();

	const server = serve({
		port,
		hostname: host,
		async fetch(req) {
			const url = new URL(req.url);
			const { pathname } = url;

			if (req.method === "OPTIONS") return okOptions();

			// Handle API routes first
			if (pathname.startsWith("/api")) {
				// Handle dynamic transaction route
				if (pathname.startsWith("/api/transaction/")) {
					const signature = pathname.replace("/api/transaction/", "");
					if (signature) {
						return wrap(() =>
							callRpc("getTransaction", [
								signature,
								{ encoding: "jsonParsed" },
							]),
						)(req);
					}
				}

				// Handle static API routes
				const route = routes[pathname as keyof typeof routes];
				if (route) {
					const handler = route[req.method as keyof typeof route];
					if (handler) return handler(req);
				}
			}

			// Handle web assets if available
			if (webAssets) {
				const assetPath = pathname === "/" ? "/index.html" : pathname;

				const asset = webAssets.getAsset(assetPath);
				if (asset) {
					if (assetPath.endsWith(".html")) {
						let html = decoder.decode(asset);
						html = injectAgiServerScript(html, url);

						return new Response(html, {
							headers: {
							"Content-Type": "text/html; charset=utf-8",
							"Cache-Control": "no-cache",
							...CORS,
						},
						});
					}

					return new Response(asset, {
						headers: {
							"Content-Type": getMimeType(assetPath),
							"Cache-Control": "public, max-age=31536000",
							...CORS,
						},
					});
				}

				if (!pathname.startsWith("/api")) {
					const indexAsset = webAssets.getAsset("/index.html");
					if (indexAsset) {
						let html = decoder.decode(indexAsset);
						html = injectAgiServerScript(html, url);

						return new Response(html, {
							headers: {
							"Content-Type": "text/html; charset=utf-8",
							"Cache-Control": "no-cache",
							...CORS,
						},
						});
					}
				}
			}

			return new Response("Not found", { status: 404, headers: CORS });
		},
		development: false,
	});
	console.log(`🌐  API server running at http://${host}:${server.port}`);
	return { server, port: server.port };
}
