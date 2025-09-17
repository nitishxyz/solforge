export interface ApiConfig {
	rpcUrl: string;
}

export interface ApiStatus {
	slot: number;
	slotBigint: string;
	blockHeight: number;
	blockHeightBigint: string;
	txCount: number;
	txCountBigint: string;
	latestBlockhash: string;
	faucet: {
		address: string;
		lamports: string;
		sol: number;
	};
}

export interface ProgramSummary {
	programId: string;
	owner: string;
	executable: boolean;
	dataLen: number;
	lamports: string;
}

export interface TokenSummary {
	mint: string;
	supply: string;
	decimals: number;
	uiAmount: number;
	uiAmountString: string;
	mintAuthority: string | null;
	isInitialized: boolean;
}

export interface AirdropPayload {
	address: string;
	lamports?: string | number;
	sol?: string | number;
}

export interface MintPayload {
	mint: string;
	owner: string;
	amountRaw: string;
}

export interface CloneProgramPayload {
	programId: string;
	endpoint?: string;
	withAccounts?: boolean;
	accountsLimit?: number;
}

export interface CloneTokenPayload {
	mint: string;
	endpoint?: string;
	cloneAccounts?: boolean;
	holders?: number;
	allAccounts?: boolean;
}

interface ApiError {
	error?: string;
	details?: unknown;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers ?? {});
	if (!headers.has("content-type") && init.body)
		headers.set("content-type", "application/json");
	const response = await fetch(path, { ...init, headers });
	let payload: any = null;
	const text = await response.text();
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch (error) {
			throw new Error(
				`Failed to parse response from ${path}: ${String(error)}`,
			);
		}
	}
	if (!response.ok) {
		const errPayload = payload as ApiError | null;
		const message =
			errPayload?.error || response.statusText || "Request failed";
		throw new Error(message);
	}
	return payload as T;
}

export const fetchConfig = () => request<ApiConfig>("/api/config");
export const fetchStatus = () => request<ApiStatus>("/api/status");
export const fetchPrograms = () => request<ProgramSummary[]>("/api/programs");
export const fetchTokens = () => request<TokenSummary[]>("/api/tokens");
export const submitAirdrop = (body: AirdropPayload) =>
	request<{ ok: boolean; signature?: string }>("/api/airdrop", {
		method: "POST",
		body: JSON.stringify(body),
	});
export const submitMint = (body: MintPayload) =>
	request<
		| {
				ok: boolean;
				signature?: string;
				mint: string;
				owner: string;
				amount: string;
		  }
		| Record<string, unknown>
	>("/api/mint", {
		method: "POST",
		body: JSON.stringify(body),
	});
export const cloneProgram = (body: CloneProgramPayload) =>
	request<Record<string, unknown>>("/api/clone/program", {
		method: "POST",
		body: JSON.stringify(body),
	});
export const cloneToken = (body: CloneTokenPayload) =>
	request<Record<string, unknown>>("/api/clone/token", {
		method: "POST",
		body: JSON.stringify(body),
	});
