import { useCallback } from "react";
import type { ChatClient } from "../lib/api";
import type { ChatMessage } from "../lib/types";

interface UseStreamingOptions {
	client: ChatClient | null;
	sessionId: string | null;
	activeSession: any;
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
	setError: React.Dispatch<React.SetStateAction<string | null>>;
	setActiveSession: React.Dispatch<React.SetStateAction<any>>;
	upsertSessionSummary: (session: any, lastMessage?: any) => void;
}

export function useStreaming(options: UseStreamingOptions) {
	const {
		client,
		sessionId,
		activeSession,
		setMessages,
		setError,
		setActiveSession,
		upsertSessionSummary,
	} = options;

	const sendMessageWithStreaming = useCallback(
		async (
			content: string,
			optimisticUserMessage: ChatMessage,
			optimisticAssistantMessage: ChatMessage,
		) => {
			if (!client || !sessionId) {
				throw new Error("Client or session not ready");
			}

			let realUserMessage: ChatMessage | null = null;
			let streamedContent = "";

			try {
				for await (const event of client.sendMessageStream(sessionId, {
					content,
				})) {
					if (event.type === "userMessage") {
						realUserMessage = event.message;
					} else if (event.type === "chunk" && event.content) {
						streamedContent += event.content;

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
					} else if (event.type === "complete") {
						// Replace optimistic messages with final ones
						setMessages((prev) => {
							const filtered = prev.filter(
								(msg) =>
									msg.id !== optimisticUserMessage.id &&
									msg.id !== optimisticAssistantMessage.id,
							);

							const updates = [...filtered];
							if (realUserMessage) {
								updates.push(realUserMessage);
							}
							if (event.assistantMessage) {
								updates.push(event.assistantMessage);
							}
							return updates;
						});

						if (event.session) {
							upsertSessionSummary(
								event.session,
								event.assistantMessage ?? undefined,
							);
							setActiveSession(event.session);
						}
					} else if (event.type === "error") {
						throw new Error(event.error || "Stream error");
					}
				}

				return {
					session: activeSession!,
					userMessage: realUserMessage!,
					assistantMessage: null,
				};
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
			}
		},
		[
			client,
			sessionId,
			activeSession,
			setMessages,
			setError,
			setActiveSession,
			upsertSessionSummary,
		],
	);

	return { sendMessageWithStreaming };
}
