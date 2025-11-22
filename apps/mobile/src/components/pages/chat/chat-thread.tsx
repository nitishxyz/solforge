import { Box, Text } from "@/src/components/ui/primitives";
import { FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage, ChatSession } from "@/src/lib/types";
import { useRef, useEffect } from "react";
import { UserMessage } from "@/src/components/molecules/user-message";
import { AssistantMessage } from "@/src/components/molecules/assistant-message";
import { MessageComposer } from "@/src/components/molecules/message-composer";
import { useUnistyles } from "react-native-unistyles";
import { LinearGradient } from "expo-linear-gradient";

interface ChatThreadProps {
    session: ChatSession | null;
    messages: ChatMessage[];
    sending: boolean;
    onBack: () => void;
    onSend: (content: string) => Promise<void>;
}

export function ChatThread({ session, messages, sending, onBack, onSend }: ChatThreadProps) {
    const flatListRef = useRef<FlatList>(null);
    const { theme } = useUnistyles();

    // Auto-scroll when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const content = item.parts.find(p => p.type === "text")?.content?.text || "";
        const createdAt = item.createdAt ? new Date(item.createdAt) : undefined;
        
        if (item.role === "user") {
            return <UserMessage content={content} createdAt={createdAt} />;
        }
        
        // For assistant, check if it's a pending message with no content (loading state)
        const isLoading = item.status === "pending" && !content;
        
        return (
            <AssistantMessage 
                content={content} 
                createdAt={createdAt} 
                isLoading={isLoading}
                agent={item.agent}
                provider={item.provider}
                model={item.model}
            />
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
        >
            <Box flex safeArea style={{ backgroundColor: theme.colors.background.default }}>
                <LinearGradient
                    colors={[
                        theme.colors.background.default,
                        theme.colors.background.default,
                        `${theme.colors.background.default}dd`,
                        `${theme.colors.background.default}00`
                    ]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 44 }}
                >
                    <Box 
                        direction="row" 
                        alignItems="center" 
                        p="md" 
                        style={{ backgroundColor: 'transparent' }}
                    >
                        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text.default} />
                        </TouchableOpacity>
                        <Text size="lg" weight="bold" style={{ marginLeft: 16, color: theme.colors.text.default }} numberOfLines={1}>
                            {session?.title || "Chat"}
                        </Text>
                    </Box>
                </LinearGradient>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingTop: 120, paddingBottom: 120 }}
                    renderItem={renderMessage}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                />

                <LinearGradient
                    colors={[
                        `${theme.colors.background.default}00`,
                        `${theme.colors.background.default}dd`,
                        theme.colors.background.default,
                        theme.colors.background.default
                    ]}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
                >
                    <MessageComposer 
                        onSubmit={onSend}
                        disabled={!session || sending}
                    />
                </LinearGradient>
            </Box>
        </KeyboardAvoidingView>
    );
}
