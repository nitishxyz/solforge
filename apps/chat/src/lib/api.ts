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
import { toast } from "sonner";

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
	import.meta.env.AI_API_URL ?? "http://localhost:4000";
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

				// Try to settle payment with toast notifications
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

				// Show toast with loading state
				const toastId = toast.loading("Funding required...");

				try {
					// Update toast to show signing state
					toast.loading("Signing transaction...", { id: toastId });

					// Create payment payload (this involves signing)
					if (!this.walletAdapter) {
						throw new Error("Wallet not configured");
					}

					const paymentPayload = await this.x402Client.createPaymentPayload(
						this.walletAdapter,
						requirement,
					);

					// Update toast to show sending state
					toast.loading("Sending transaction...", { id: toastId });

					// Send the payment
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
						throw new Error(
							`Top-up failed (${topupResponse.status}): ${errorText}`,
						);
					}

					const topupResult = await topupResponse.json();

					// Show success toast
					toast.success(
						`Payment complete: +$${topupResult.amount_usd} (balance: $${topupResult.new_balance})`,
						{ id: toastId, duration: 3000 },
					);

					console.log(
						`✅ Top-up complete: +$${topupResult.amount_usd} (balance: $${topupResult.new_balance})`,
					);

					// Refetch wallet balance after payment
					if ((window as any).__refetchWalletBalance) {
						(window as any).__refetchWalletBalance();
					}

					// Update SolForge balance
					if ((window as any).__updateSolforgeBalance) {
						(window as any).__updateSolforgeBalance(topupResult.new_balance);
					}
				} catch (paymentError: any) {
					toast.error(`Payment failed: ${paymentError.message}`, {
						id: toastId,
						duration: 5000,
					});
					throw paymentError;
				}

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

	async getBalance(): Promise<{
		wallet_address: string;
		balance_usd: string;
		total_spent: string;
		total_topups: string;
		request_count: number;
		last_payment: string | null;
		last_request: string | null;
	}> {
		return this.request("/v1/balance", { method: "GET" });
	}
}

export type { ChatSession, ChatSessionSummary };
