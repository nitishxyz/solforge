import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type {
	ApiConfig,
	ApiStatus,
	ProgramSummary,
	TokenSummary,
	AirdropPayload,
	MintPayload,
	CloneProgramPayload,
	CloneTokenPayload,
	Transaction,
	TransactionDetails,
} from "./types";

export const configQuery = queryOptions({
	queryKey: ["config"],
	queryFn: () => api.get<ApiConfig>("/api/config"),
	staleTime: Number.POSITIVE_INFINITY,
});

export const statusQuery = queryOptions({
	queryKey: ["status"],
	queryFn: () => api.get<ApiStatus>("/api/status"),
	refetchInterval: 5000,
});

export const programsQuery = queryOptions({
	queryKey: ["programs"],
	queryFn: () => api.get<ProgramSummary[]>("/api/programs"),
});

export const tokensQuery = queryOptions({
	queryKey: ["tokens"],
	queryFn: () => api.get<TokenSummary[]>("/api/tokens"),
});

export const airdropMutation = {
	mutationFn: (payload: AirdropPayload) =>
		api.post<{ ok: boolean; signature?: string }>("/api/airdrop", payload),
};

export const mintMutation = {
	mutationFn: (payload: MintPayload) =>
		api.post<{ ok: boolean; signature?: string }>("/api/mint", payload),
};

export const cloneProgramMutation = {
	mutationFn: (payload: CloneProgramPayload) =>
		api.post<Record<string, unknown>>("/api/clone/program", payload),
};

export const cloneTokenMutation = {
	mutationFn: (payload: CloneTokenPayload) =>
		api.post<Record<string, unknown>>("/api/clone/token", payload),
};

export const transactionsQuery = queryOptions({
	queryKey: ["transactions"],
	queryFn: () => api.get<Transaction[]>("/api/transactions"),
});

export const transactionQuery = (signature: string) =>
	queryOptions({
		queryKey: ["transaction", signature],
		queryFn: () => api.get<TransactionDetails>(`/api/transaction/${signature}`),
	});
