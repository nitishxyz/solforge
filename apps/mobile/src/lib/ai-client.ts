import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { ChatMessage } from "./types";
import type { ChatClient } from "./api";
import { toast } from "./toast";
import { fetchStream } from "./fetch-stream";

// TODO: Move to env vars
const DEFAULT_BASE_URL = "https://ai.solforge.sh";
const TARGET_TOPUP_AMOUNT_MICRO_USDC = "100000"; // $0.10

export interface AIClientConfig {
    baseUrl?: string;
    chatClient: ChatClient;
}

/**
 * Create a custom fetch function that adds authentication headers and handles 402
 */
function createAuthenticatedFetch(chatClient: ChatClient): typeof fetch {
    const baseFetch = fetchStream as typeof fetch;

    return async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
    ) => {
        const maxAttempts = 3;
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;

            // Get auth headers from ChatClient
            const authHeaders = await (chatClient as any).createAuthHeaders();

            // Merge headers
            const headers = new Headers(init?.headers);
            Object.entries(authHeaders).forEach(([key, value]) => {
                headers.set(key, value as string);
            });

            // Make request with auth headers
            const response = await baseFetch(input, {
                ...init,
                headers,
            });

            // Handle 402 Payment Required
            if (response.status === 402) {
                if (attempts >= maxAttempts) {
                    throw new Error("Unable to settle payment after multiple attempts");
                }

                const errorData = await response.json().catch(() => ({}));
                const payload = errorData || {};
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
                    const walletAdapter = (chatClient as any).walletAdapter;
                    const x402Client = (chatClient as any).x402Client;

                    if (!walletAdapter) {
                        throw new Error("Wallet not configured");
                    }

                    const paymentPayload = await x402Client.createPaymentPayload(
                        walletAdapter,
                        requirement,
                    );

                    // Update toast to show sending state
                    toast.loading("Sending transaction...", { id: toastId });

                    // Send the payment
                    const baseUrl = (chatClient as any).baseUrl;
                    const topupAuthHeaders = await (
                        chatClient as any
                    ).createAuthHeaders();
                    const topupResponse = await baseFetch(`${baseUrl}/v1/topup`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...topupAuthHeaders,
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

                    // Retry the original request
                    continue;
                } catch (paymentError: any) {
                    toast.error(`Payment failed: ${paymentError.message}`, {
                        id: toastId,
                        duration: 5000,
                    });
                    throw paymentError;
                }
            }

            // If not 402, return the response
            return response;
        }

        throw new Error("Unable to complete request after multiple attempts");
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
        fetch: createAuthenticatedFetch(config.chatClient) as any,
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
