import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { ChatMessage } from "./types";
import type { ChatClient } from "./api";

const DEFAULT_BASE_URL =
	import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:4000";

export interface AIClientConfig {
	baseUrl?: string;
	chatClient: ChatClient;
}

/**
 * Create a custom fetch function that adds authentication headers
 */
function createAuthenticatedFetch(chatClient: ChatClient): typeof fetch {
	const baseFetch = globalThis.fetch;

	return async (
		input: Parameters<typeof fetch>[0],
		init?: Parameters<typeof fetch>[1],
	) => {
		// Get auth headers from ChatClient
		const authHeaders = await (chatClient as any).createAuthHeaders();

		// Merge headers
		const headers = new Headers(init?.headers);
		Object.entries(authHeaders).forEach(([key, value]) => {
			headers.set(key, value as string);
		});

		// Make request with auth headers
		return baseFetch(input, {
			...init,
			headers,
		});
	};
}

export function createAIClient(config: AIClientConfig) {
	const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

	const provider = createOpenAICompatible({
		baseURL: `${baseUrl}/v1`,
		name: "solforge",
		headers: {
			"Content-Type": "application/json",
		},
		fetch: createAuthenticatedFetch(config.chatClient),
	});

	return {
		provider,
		/**
		 * Stream completion from AI model using conversation history
		 */
		async streamCompletion(conversationHistory: ChatMessage[], model: string) {
			// Convert ChatMessage[] to AI SDK message format
			const messages = conversationHistory.map((msg) => ({
				role: msg.role as "user" | "assistant" | "system",
				content: msg.parts.find((p) => p.type === "text")?.content?.text ?? "",
			}));

			return streamText({
				model: provider.chatModel(model),
				messages,
			});
		},
	};
}
