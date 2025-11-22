import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatClient } from "../lib/api";
import { createAIClient } from "../lib/ai-client";
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
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
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
        if (autoSelectFirst && !selectedSessionId && sessions.length > 0) {
            const first = sessions[0];
            setSelectedSessionId(first.id);
            setActiveSession(first);
        }
    }, [sessions, autoSelectFirst, selectedSessionId]);

    useEffect(() => {
        if (selectedSessionId) {
            const session = sessions.find(s => s.id === selectedSessionId);
            if (session) {
                setActiveSession(session);
            }
        }
    }, [selectedSessionId, sessions]);

    const selectSession = useCallback((sessionId: string) => {
        setSelectedSessionId(sessionId);
        setOptimisticMessages([]); // Clear previous optimistic messages
    }, []);

    const createSession = useCallback(
        async (input: CreateSessionInput) => {
            setError(null);
            try {
                const session = await createSessionMutation.mutateAsync(input);
                setSelectedSessionId(session.id);
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

            try {
                const aiClient = createAIClient({ chatClient: client });
                const conversationHistory = [...messages, optimisticUserMessage];

                const streamResult = await aiClient.streamCompletion(
                    conversationHistory,
                    activeSession.model,
                );

                let streamedContent = "";

                for await (const chunk of streamResult.textStream) {
                    streamedContent += chunk;
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
                }

                const response = await streamResult.response;

                // Save to server
                const savedResponse = await client.sendMessage(selectedSessionId, { content });

                // Save to DB (via mutation)
                await saveMessageMutation.mutateAsync({ sessionId: selectedSessionId, message: savedResponse.userMessage });
                if (savedResponse.assistantMessage) {
                    await saveMessageMutation.mutateAsync({ sessionId: selectedSessionId, message: savedResponse.assistantMessage });
                }

                // Clear optimistic messages (will be replaced by DB messages)
                setOptimisticMessages(prev =>
                    prev.filter(m => m.id !== optimisticUserMessage.id && m.id !== optimisticAssistantMessage.id)
                );

                return savedResponse;

            } catch (err) {
                setOptimisticMessages(prev =>
                    prev.filter(m => m.id !== optimisticUserMessage.id && m.id !== optimisticAssistantMessage.id)
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
        sending,
        error,
        refreshSessions,
        selectSession,
        createSession,
        sendMessage,
        setError,
    };
}
