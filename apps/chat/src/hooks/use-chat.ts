import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatClient } from "../lib/api";
import { createAIClient } from "../lib/ai-client";
import type {
	ChatMessage,
	ChatSession,
	ChatSessionSummary,
} from "../lib/types";

interface UseChatOptions {
	client: ChatClient | null;
	autoSelectFirst?: boolean;
}

interface CreateSessionInput {
	title?: string | null;
	agent: string;
	provider: string;
	model: string;
	projectPath: string;
}

export function useChat({ client, autoSelectFirst = true }: UseChatOptions) {
	const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
	const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [loadingThread, setLoadingThread] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refreshSessions = useCallback(async () => {
		if (!client) {
			return;
		}
		setLoadingSessions(true);
		setError(null);
		try {
			const response = await client.listSessions();
			setSessions(response.sessions);

			if (
				autoSelectFirst &&
				!selectedSessionId &&
				response.sessions.length > 0
			) {
				const first = response.sessions[0];
				setSelectedSessionId(first.id);
				setActiveSession(first);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load sessions";
			setError(message);
		} finally {
			setLoadingSessions(false);
		}
	}, [autoSelectFirst, client, selectedSessionId]);

	const loadSession = useCallback(
		async (sessionId: string) => {
			if (!client) {
				return;
			}
			setLoadingThread(true);
			setError(null);
			try {
				const detail = await client.getSession(sessionId);
				setActiveSession(detail.session);
				setMessages(detail.messages);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to load conversation";
				setError(message);
			} finally {
				setLoadingThread(false);
			}
		},
		[client],
	);

	useEffect(() => {
		if (!client) {
			return;
		}
		refreshSessions();
	}, [client, refreshSessions]);

	useEffect(() => {
		if (!client || !selectedSessionId) {
			return;
		}
		loadSession(selectedSessionId);
	}, [client, loadSession, selectedSessionId]);

	const selectSession = useCallback((sessionId: string) => {
		setSelectedSessionId(sessionId);
	}, []);

	const upsertSessionSummary = useCallback(
		(session: ChatSession, lastMessage?: ChatMessage) => {
			setSessions((prev) => {
				const existingIdx = prev.findIndex((item) => item.id === session.id);
				const summary: ChatSessionSummary = {
					...session,
					lastMessage:
						lastMessage && lastMessage.parts.length > 0
							? {
									id: lastMessage.id,
									role: lastMessage.role,
									status: lastMessage.status,
									createdAt: lastMessage.createdAt,
									preview:
										lastMessage.parts.find((part: any) => part.type === "text")
											?.content?.text ?? null,
								}
							: prev[existingIdx]?.lastMessage,
				};

				if (existingIdx === -1) {
					return [summary, ...prev];
				}

				const next = [...prev];
				next.splice(existingIdx, 1);
				return [summary, ...next];
			});
		},
		[],
	);

	const createSession = useCallback(
		async (input: CreateSessionInput) => {
			if (!client) {
				throw new Error("Wallet not ready");
			}
			setError(null);
			try {
				const session = await client.createSession(input);
				upsertSessionSummary(session);
				setSelectedSessionId(session.id);
				setActiveSession(session);
				setMessages([]);
				return session;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to create session";
				setError(message);
				throw err;
			}
		},
		[client, upsertSessionSummary],
	);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!client) {
				throw new Error("Wallet not ready");
			}
			if (!selectedSessionId || !activeSession) {
				throw new Error("No session selected");
			}

			// Create optimistic user message
			const optimisticUserMessage: ChatMessage = {
				id: `temp-user-${Date.now()}`,
				sessionId: selectedSessionId,
				role: "user",
				parts: [
					{
						id: `temp-part-${Date.now()}`,
						messageId: `temp-user-${Date.now()}`,
						index: 0,
						stepIndex: null,
						type: "text",
						content: { type: "text", text: content },
						agent: activeSession.agent,
						provider: activeSession.provider,
						model: activeSession.model,
						startedAt: null,
						completedAt: null,
						toolName: null,
						toolCallId: null,
						toolDurationMs: null,
					},
				],
				status: "pending",
				agent: activeSession.agent,
				provider: activeSession.provider,
				model: activeSession.model,
				createdAt: new Date().toISOString(),
				completedAt: null,
				latencyMs: null,
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cachedInputTokens: null,
				reasoningTokens: null,
				error: null,
				errorType: null,
				errorDetails: null,
				isAborted: null,
			};

			// Create optimistic assistant message (will stream into this)
			const optimisticAssistantMessage: ChatMessage = {
				id: `temp-assistant-${Date.now()}`,
				sessionId: selectedSessionId,
				role: "assistant",
				parts: [
					{
						id: `temp-part-assistant-${Date.now()}`,
						messageId: `temp-assistant-${Date.now()}`,
						index: 0,
						stepIndex: null,
						type: "text",
						content: { type: "text", text: "" },
						agent: activeSession.agent,
						provider: activeSession.provider,
						model: activeSession.model,
						startedAt: null,
						completedAt: null,
						toolName: null,
						toolCallId: null,
						toolDurationMs: null,
					},
				],
				status: "pending",
				agent: activeSession.agent,
				provider: activeSession.provider,
				model: activeSession.model,
				createdAt: new Date().toISOString(),
				completedAt: null,
				latencyMs: null,
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cachedInputTokens: null,
				reasoningTokens: null,
				error: null,
				errorType: null,
				errorDetails: null,
				isAborted: null,
			};

			// Add optimistic messages immediately
			setMessages((prev) => [
				...prev,
				optimisticUserMessage,
				optimisticAssistantMessage,
			]);
			setSending(true);
			setError(null);

			try {
				// Create AI client for streaming
				const aiClient = createAIClient({ chatClient: client });

				// Build conversation history including the new user message
				const conversationHistory = [...messages, optimisticUserMessage];

				// Stream the AI response
				const streamResult = await aiClient.streamCompletion(
					conversationHistory,
					activeSession.model,
				);

				let streamedContent = "";

				// Stream chunks and update UI in real-time
				for await (const chunk of streamResult.textStream) {
					streamedContent += chunk;

					// Update the optimistic assistant message with streamed content
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === optimisticAssistantMessage.id
								? {
										...msg,
										parts: [
											{
												...msg.parts[0],
												content: { type: "text", text: streamedContent },
											},
										],
									}
								: msg,
						),
					);
				}

				// Get response metadata from stream result (includes balance deduction)
				const response = await streamResult.response;

				// Check if balance was returned in the stream metadata
				if ((response as any)?.solforge_metadata?.balance_remaining) {
					const newBalance = (response as any).solforge_metadata
						.balance_remaining;
					if ((window as any).__updateSolforgeBalance) {
						(window as any).__updateSolforgeBalance(newBalance);
					}
				}

				// After streaming completes, save to database
				const savedResponse = await client.sendMessage(selectedSessionId, {
					content,
				});

				// Also update balance from saved response if available
				if (savedResponse.usage?.balanceRemaining !== undefined) {
					if ((window as any).__updateSolforgeBalance) {
						(window as any).__updateSolforgeBalance(
							savedResponse.usage.balanceRemaining.toFixed(2),
						);
					}
				}

				// Replace optimistic messages with real database messages
				setMessages((prev) => {
					const filtered = prev.filter(
						(msg) =>
							msg.id !== optimisticUserMessage.id &&
							msg.id !== optimisticAssistantMessage.id,
					);

					return [
						...filtered,
						savedResponse.userMessage,
						...(savedResponse.assistantMessage
							? [savedResponse.assistantMessage]
							: []),
					];
				});

				// Update session summary
				upsertSessionSummary(
					savedResponse.session,
					savedResponse.assistantMessage ?? undefined,
				);
				setActiveSession(savedResponse.session);

				return savedResponse;
			} catch (err) {
				// Remove optimistic messages on error
				setMessages((prev) =>
					prev.filter(
						(msg) =>
							msg.id !== optimisticUserMessage.id &&
							msg.id !== optimisticAssistantMessage.id,
					),
				);

				const message =
					err instanceof Error ? err.message : "Failed to send message";
				setError(message);
				throw err;
			} finally {
				setSending(false);
			}
		},
		[client, selectedSessionId, activeSession, messages, upsertSessionSummary],
	);

	const state = useMemo(
		() => ({
			sessions,
			activeSession,
			messages,
			selectedSessionId,
			loadingSessions,
			loadingThread,
			sending,
			error,
		}),
		[
			sessions,
			activeSession,
			messages,
			selectedSessionId,
			loadingSessions,
			loadingThread,
			sending,
			error,
		],
	);

	return {
		...state,
		refreshSessions,
		selectSession,
		loadSession,
		createSession,
		sendMessage,
		setError,
	};
}
