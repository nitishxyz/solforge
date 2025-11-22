import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, desc, asc } from "drizzle-orm";
import db from "../db";
import { sessions, messages } from "../db/schema";
import type { ChatSession, ChatMessage } from "../lib/types";
import type { ChatClient } from "../lib/api";
import type { ChatSessionSummary } from "../lib/types";

export function useSessionsQuery() {
    return useQuery({
        queryKey: ["sessions"],
        queryFn: async () => {
            const result = await db
                .select()
                .from(sessions)
                .orderBy(desc(sessions.updatedAt));

            return result.map(s => ({
                id: s.id,
                walletAddress: "", // Not stored in local DB
                title: s.title,
                agent: s.agent,
                provider: s.provider,
                model: s.model,
                projectPath: s.projectPath,
                createdAt: s.createdAt.toISOString(),
                lastActiveAt: s.lastActiveAt?.toISOString() ?? null,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalCachedTokens: 0,
                totalReasoningTokens: 0,
                totalToolTimeMs: 0,
                toolCounts: {},
                lastMessage: s.lastMessagePreview ? {
                    id: "", // Not stored in session summary
                    role: "user", // specific role not stored
                    status: "complete",
                    createdAt: s.updatedAt?.toISOString() ?? new Date().toISOString(),
                    preview: s.lastMessagePreview
                } : undefined
            })) as ChatSessionSummary[];
        },
    });
}

export function useSessionMessagesQuery(sessionId: string | null) {
    return useQuery({
        queryKey: ["messages", sessionId],
        queryFn: async () => {
            if (!sessionId) return [];
            const result = await db
                .select()
                .from(messages)
                .where(eq(messages.sessionId, sessionId))
                .orderBy(asc(messages.createdAt));

            // Parse content JSON and transform to ChatMessage
            return result.map(msg => ({
                ...msg,
                content: undefined, // Remove raw content field if it exists in spread
                parts: JSON.parse(msg.content as string),
                createdAt: msg.createdAt.toISOString(),
                completedAt: null, // Not currently stored
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
            })) as ChatMessage[];
        },
        enabled: !!sessionId,
    });
}

export function useCreateSessionMutation(client: ChatClient | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: {
            title?: string | null;
            agent: string;
            provider: string;
            model: string;
            projectPath: string;
        }) => {
            if (!client) throw new Error("Client not initialized");

            // 1. Create on server
            const session = await client.createSession(input);

            // 2. Save to DB
            await db.insert(sessions).values({
                id: session.id,
                title: session.title,
                agent: session.agent,
                provider: session.provider,
                model: session.model,
                projectPath: session.projectPath,
                createdAt: new Date(session.createdAt),
                updatedAt: new Date(session.createdAt),
                lastActiveAt: new Date(session.createdAt),
            });

            return session;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
        },
    });
}

export function useSaveMessageMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            sessionId: string;
            message: ChatMessage;
        }) => {
            const { sessionId, message } = params;

            // Upsert message
            await db.insert(messages).values({
                id: message.id,
                sessionId,
                role: message.role,
                content: JSON.stringify(message.parts), // Storing parts as content for now
                status: message.status,
                agent: message.agent,
                provider: message.provider,
                model: message.model,
                createdAt: new Date(message.createdAt),
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: messages.id,
                set: {
                    content: JSON.stringify(message.parts),
                    status: message.status,
                    updatedAt: new Date(),
                }
            });

            // Update session last active
            await db.update(sessions)
                .set({
                    lastActiveAt: new Date(),
                    updatedAt: new Date(),
                    // Update preview if it's the last message
                    lastMessagePreview: message.parts.find(p => p.type === "text")?.content?.text?.slice(0, 100)
                })
                .where(eq(sessions.id, sessionId));
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["messages", variables.sessionId] });
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
        },
    });
}

export function useUpdateSessionMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (session: ChatSession) => {
            await db.update(sessions)
                .set({
                    title: session.title,
                    updatedAt: new Date(),
                })
                .where(eq(sessions.id, session.id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
        },
    });
}
