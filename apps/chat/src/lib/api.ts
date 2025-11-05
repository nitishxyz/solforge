import type {
	ChatSession,
	ChatSessionSummary,
	ListSessionsResponse,
	SendMessageResponse,
	SessionDetailResponse,
} from "./types";
import {
	X402Client,
	type WalletAdapter,
	signMessageWithKeypair,
} from "./x402-client";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export interface WalletSigner {
	publicKey: string;
	secretKey: string;
	signNonce: (nonce: string) => Promise<string> | string;
}

interface ChatClientConfig {
	baseUrl?: string;
	wallet?: WalletSigner;
	headers?: Record<string, string>;
}

const DEFAULT_BASE_URL =
	import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:4000";
const RPC_URL =
	import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const TARGET_TOPUP_AMOUNT_MICRO_USDC = "100000"; // $0.10

class SimpleWalletAdapter implements WalletAdapter {
	public readonly keypair: Keypair;

	constructor(keypair: Keypair) {
		this.keypair = keypair;
	}

	get publicKey(): PublicKey {
		return this.keypair.publicKey;
	}

	get secretKey(): Uint8Array | undefined {
		return this.keypair.secretKey;
	}

	async signTransaction(tx: any): Promise<any> {
		if ("version" in tx) {
			tx.sign([this.keypair]);
			return tx;
		}
		tx.partialSign(this.keypair);
		return tx;
	}
}

async function parseResponse<T>(response: Response): Promise<T> {
	const contentType = response.headers.get("content-type");
	const isJson = contentType?.includes("application/json");

	if (!response.ok) {
		const payload = isJson ? await response.json().catch(() => ({})) : {};
		const message =
			typeof payload?.error?.message === "string"
				? payload.error.message
				: `Request failed with status ${response.status}`;
		const error = new Error(message);
		(error as any).status = response.status;
		(error as any).payload = payload;
		throw error;
	}

	return (isJson ? await response.json() : await response.text()) as T;
}

export class ChatClient {
	private readonly baseUrl: string;
	private readonly wallet?: WalletSigner;
	private readonly extraHeaders?: Record<string, string>;
	private readonly x402Client: X402Client;
	private walletAdapter?: WalletAdapter;

	constructor(config: ChatClientConfig = {}) {
		this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
		this.wallet = config.wallet;
		this.extraHeaders = config.headers;
		this.x402Client = new X402Client(RPC_URL);

		if (this.wallet) {
			const keypair = Keypair.fromSecretKey(bs58.decode(this.wallet.secretKey));
			this.walletAdapter = new SimpleWalletAdapter(keypair);
		}
	}

	private async createAuthHeaders(): Promise<Record<string, string>> {
		if (!this.wallet || !this.walletAdapter) {
			return {};
		}

		const nonce = Date.now().toString();
		const message = new TextEncoder().encode(nonce);
		const keypair = Keypair.fromSecretKey(bs58.decode(this.wallet.secretKey));
		const signature = signMessageWithKeypair(keypair, message);

		return {
			"x-wallet-address": this.wallet.publicKey,
			"x-wallet-nonce": nonce,
			"x-wallet-signature": bs58.encode(signature),
		};
	}

	private async settlePayment(requirement: any): Promise<any> {
		if (!this.walletAdapter) {
			throw new Error("Wallet not configured");
		}

		const paymentPayload = await this.x402Client.createPaymentPayload(
			this.walletAdapter,
			requirement,
		);

		const authHeaders = await this.createAuthHeaders();
		const topupResponse = await fetch(`${this.baseUrl}/v1/topup`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			body: JSON.stringify({
				paymentPayload,
				paymentRequirement: requirement,
			}),
		});

		if (!topupResponse.ok) {
			const errorText = await topupResponse.text();
			throw new Error(`Top-up failed (${topupResponse.status}): ${errorText}`);
		}

		return topupResponse.json();
	}

	private async requestWithAutoTopup<T>(
		path: string,
		init: RequestInit = {},
		query?: Record<string, string | number | undefined>,
		maxAttempts = 3,
	): Promise<T> {
		let attempts = 0;

		while (attempts < maxAttempts) {
			attempts++;

			try {
				return await this.request<T>(path, init, query);
			} catch (error: any) {
				// If it's not a 402, rethrow
				if (error.status !== 402 || attempts >= maxAttempts) {
					throw error;
				}

				// Try to settle payment
				const payload = error.payload || {};
				const accepts = Array.isArray(payload.accepts) ? payload.accepts : [];
				const requirement =
					accepts.find(
						(option: any) =>
							option.scheme === "exact" &&
							option.maxAmountRequired === TARGET_TOPUP_AMOUNT_MICRO_USDC,
					) ?? accepts.find((option: any) => option.scheme === "exact");

				if (!requirement) {
					throw new Error(
						"No supported payment requirement returned by server",
					);
				}

				const topupResult = await this.settlePayment(requirement);
				console.log(
					`✅ Top-up complete: +$${topupResult.amount_usd} (balance: $${topupResult.new_balance})`,
				);

				// Retry the request
				continue;
			}
		}

		throw new Error("Unable to settle payment after multiple attempts");
	}

	private async request<T>(
		path: string,
		init: RequestInit = {},
		query?: Record<string, string | number | undefined>,
	): Promise<T> {
		const url = new URL(path, this.baseUrl);
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value != null) {
					url.searchParams.set(key, String(value));
				}
			}
		}

		const headers = new Headers({
			"content-type": "application/json",
			...this.extraHeaders,
		});

		if (init.headers) {
			const provided = new Headers(init.headers as HeadersInit);
			provided.forEach((value, key) => {
				headers.set(key, value);
			});
		}

		if (this.wallet) {
			const authHeaders = await this.createAuthHeaders();
			Object.entries(authHeaders).forEach(([key, value]) => {
				headers.set(key, value);
			});
		}

		const response = await fetch(url, {
			...init,
			headers,
		});

		return parseResponse<T>(response);
	}

	async listSessions(params?: {
		limit?: number;
		offset?: number;
	}): Promise<ListSessionsResponse> {
		return this.requestWithAutoTopup<ListSessionsResponse>(
			"/v1/chat/sessions",
			{ method: "GET" },
			{
				limit: params?.limit,
				offset: params?.offset,
			},
		);
	}

	async createSession(input: {
		title?: string | null;
		agent: string;
		provider: string;
		model: string;
		projectPath: string;
	}): Promise<ChatSession> {
		const payload = await this.requestWithAutoTopup<{ session: ChatSession }>(
			"/v1/chat/sessions",
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
		return payload.session;
	}

	async getSession(
		sessionId: string,
		params?: { limit?: number; offset?: number },
	): Promise<SessionDetailResponse> {
		return this.requestWithAutoTopup<SessionDetailResponse>(
			`/v1/chat/sessions/${sessionId}`,
			{ method: "GET" },
			{
				limit: params?.limit,
				offset: params?.offset,
			},
		);
	}

	async sendMessage(
		sessionId: string,
		input: { content: string },
	): Promise<SendMessageResponse> {
		return this.requestWithAutoTopup<SendMessageResponse>(
			`/v1/chat/sessions/${sessionId}/messages`,
			{
				method: "POST",
				body: JSON.stringify(input),
			},
		);
	}

	async *sendMessageStream(
		sessionId: string,
		input: { content: string },
	): AsyncGenerator<{
		type: "userMessage" | "chunk" | "complete" | "error";
		message?: any;
		content?: string;
		assistantMessage?: any;
		session?: any;
		error?: string;
	}> {
		const url = new URL(
			`/v1/chat/sessions/${sessionId}/messages`,
			this.baseUrl,
		);

		const headers = new Headers({
			"content-type": "application/json",
			...this.extraHeaders,
		});

		if (this.wallet) {
			const authHeaders = await this.createAuthHeaders();
			Object.entries(authHeaders).forEach(([key, value]) => {
				headers.set(key, value);
			});
		}

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify({ ...input, stream: true }),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData?.error?.message || `Request failed: ${response.status}`,
			);
		}

		if (!response.body) {
			throw new Error("No response body");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);

						if (data === "[DONE]") {
							return;
						}

						try {
							const parsed = JSON.parse(data);
							yield parsed;
						} catch (e) {
							console.error("Failed to parse SSE data:", data);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}

export type { ChatSession, ChatSessionSummary };
