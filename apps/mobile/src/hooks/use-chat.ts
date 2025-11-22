import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatClient } from "../lib/api";
import type {
    ChatMessage,
    ChatSession,
    ChatSessionSummary,
} from "../lib/types";
import {
    useSessionsQuery,
    useSessionMessagesQuery,
    useCreateSessionMutation,
    useSaveMessageMutation
} from "./use-chat-query";

interface UseChatOptions {
    client: ChatClient | null;
    sessionId?: string | null;
    autoSelectFirst?: boolean;
}

interface CreateSessionInput {
    title?: string | null;
    agent: string;
    provider: string;
    model: string;
    projectPath: string;
}

export function useChat({ client, sessionId, autoSelectFirst = true }: UseChatOptions) {
    const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
    const selectedSessionId = sessionId ?? internalSessionId;

    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Queries
    const { data: sessions = [], isLoading: loadingSessions, refetch: refreshSessions } = useSessionsQuery();
    const { data: dbMessages = [], isLoading: loadingThread } = useSessionMessagesQuery(selectedSessionId);

    // Mutations
    const createSessionMutation = useCreateSessionMutation(client);
    const saveMessageMutation = useSaveMessageMutation();

    // Local state for optimistic messages (streaming)
    const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

    // Combine DB messages and optimistic messages
    const messages = useMemo(() => {
        // Filter out optimistic messages that have been saved to DB (by ID)
        const dbIds = new Set(dbMessages.map(m => m.id));
        const pendingOptimistic = optimisticMessages.filter(m => !dbIds.has(m.id));
        return [...dbMessages, ...pendingOptimistic];
    }, [dbMessages, optimisticMessages]);

    useEffect(() => {
        if (autoSelectFirst && !selectedSessionId && sessions.length > 0 && !sessionId) {
            const first = sessions[0];
            setInternalSessionId(first.id);
            setActiveSession(first);
        }
    }, [sessions, autoSelectFirst, selectedSessionId, sessionId]);

    useEffect(() => {
        if (selectedSessionId) {
            const session = sessions.find(s => s.id === selectedSessionId);
            if (session) {
                setActiveSession(session);
            }
        }
    }, [selectedSessionId, sessions]);

    const selectSession = useCallback((sessionId: string) => {
        setInternalSessionId(sessionId);
        setOptimisticMessages([]); // Clear previous optimistic messages
    }, []);

    const createSession = useCallback(
        async (input: CreateSessionInput) => {
            setError(null);
            try {
                const session = await createSessionMutation.mutateAsync(input);
                setInternalSessionId(session.id);
                setActiveSession(session);
                setOptimisticMessages([]);
                return session;
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create session";
                setError(message);
                throw err;
            }
        },
        [createSessionMutation]
    );

    const sendMessage = useCallback(
        async (content: string) => {
            if (!client) throw new Error("Wallet not ready");
            if (!selectedSessionId || !activeSession) throw new Error("No session selected");

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
            // Fix parts assignment
            optimisticUserMessage.parts = optimisticUserMessage.parts;

            // Create optimistic assistant message
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
            optimisticAssistantMessage.parts = optimisticAssistantMessage.parts;

            setOptimisticMessages(prev => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
            setSending(true);
            setError(null);

            let streamedContent = "";

            try {
                const stream = await client.sendMessageStream(selectedSessionId, { content });
                const reader = stream.getReader();
                // Ensure TextDecoder is available
                const decoder = typeof TextDecoder !== "undefined" 
                    ? new TextDecoder() 
                    : { decode: (val: Uint8Array) => String.fromCharCode(...val) } as any; // Fallback if polyfill missing
                let buffer = "";
                let finalResponse: any = null;
                let serverUserMessage: ChatMessage | null = null;
                let serverAssistantMessage: ChatMessage | null = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === "data: [DONE]") continue;
                        if (trimmed.startsWith("data: ")) {
                            try {
                                const data = JSON.parse(trimmed.slice(6));

                                if (data.type === "userMessage") {
                                    serverUserMessage = data.message;
                                    
                                    // Update optimistic message with real ID to allow deduplication
                                    setOptimisticMessages(prev => 
                                        prev.map(msg => 
                                            msg.id === optimisticUserMessage.id ? { ...msg, id: data.message.id } : msg
                                        )
                                    );

                                    // Save user message to local DB as soon as we get confirmation
                                    await saveMessageMutation.mutateAsync({ 
                                        sessionId: selectedSessionId, 
                                        message: data.message 
                                    });
                                } else if (data.type === "chunk") {
                                    streamedContent += data.content;
                                    setOptimisticMessages(prev =>
                                        prev.map(msg =>
                                            msg.id === optimisticAssistantMessage.id
                                                ? {
                                                    ...msg,
                                                    parts: [{
                                                        ...msg.parts[0],
                                                        content: { type: "text", text: streamedContent }
                                                    }]
                                                }
                                                : msg
                                        )
                                    );
                                } else if (data.type === "complete") {
                                    finalResponse = data;
                                    serverAssistantMessage = data.assistantMessage;

                                    // Update optimistic assistant message with real ID
                                    if (data.assistantMessage) {
                                        setOptimisticMessages(prev => 
                                            prev.map(msg => 
                                                msg.id === optimisticAssistantMessage.id ? { ...msg, id: data.assistantMessage.id } : msg
                                            )
                                        );
                                    }
                                    // Save assistant message to local DB
                                    if (data.assistantMessage) {
                                        await saveMessageMutation.mutateAsync({ 
                                            sessionId: selectedSessionId, 
                                            message: data.assistantMessage 
                                        });
                                    }
                                    
                                    // Note: we might want to update the session info too (tokens, cost), 
                                    // but mobile use-chat-query seems to focus on messages.
                                    // 'setActiveSession' can update the in-memory session state.
                                    if (data.session) {
                                        setActiveSession(data.session);
                                    }
                                } else if (data.type === "error") {
                                    throw new Error(data.error);
                                }
                            } catch (e) {
                                console.error("Error parsing SSE:", e);
                            }
                        }
                    }
                }
                
                // Clear optimistic messages
                setOptimisticMessages(prev => prev.filter(m => {
                    // Remove if it matches the original temp IDs
                    if (m.id === optimisticUserMessage.id || m.id === optimisticAssistantMessage.id) return false;
                    // Remove if it matches the resolved server IDs (if we updated them in state)
                    if (serverUserMessage && m.id === serverUserMessage.id) return false;
                    if (serverAssistantMessage && m.id === serverAssistantMessage.id) return false;
                    return true;
                }));

                // If we collected a response object that looks like the old return type, return it.
                // Otherwise construct one.
                return {
                    session: activeSession, // simplified
                    userMessage: serverUserMessage || optimisticUserMessage,
                    assistantMessage: finalResponse?.assistantMessage,
                };

            } catch (err) {
                setOptimisticMessages(prev =>
                    prev.filter(m => {
                        // On error, remove the temp messages we added
                        if (m.id === optimisticUserMessage.id || m.id === optimisticAssistantMessage.id) return false;
                        // Also check for server IDs if we happened to update them before error
                        // (though unlikely to have error after successful updates, but safe to check)
                        return true;
                    })
                );
                const message = err instanceof Error ? err.message : "Failed to send message";
                setError(message);
                throw err;
            } finally {
                setSending(false);
            }
        },
        [client, selectedSessionId, activeSession, messages, saveMessageMutation]
    );

    return {
        sessions,
        activeSession,
        messages,
        selectedSessionId,
        loadingSessions,
        loadingThread,
        isCreating: createSessionMutation.isPending,
        sending,
        error,
        refreshSessions,
        selectSession,
        createSession,
        sendMessage,
        setError,
    };
}
