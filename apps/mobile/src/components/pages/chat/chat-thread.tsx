import { Box, Text } from "@/src/components/ui/primitives";
import { Input } from "@/src/components/ui/primitives/input";
import { FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage, ChatSession } from "@/src/lib/types";
import { useState, useRef, useEffect } from "react";
import { UserMessage } from "@/src/components/molecules/user-message";
import { AssistantMessage } from "@/src/components/molecules/assistant-message";
import { useUnistyles } from "react-native-unistyles";

interface ChatThreadProps {
    session: ChatSession | null;
    messages: ChatMessage[];
    sending: boolean;
    onBack: () => void;
    onSend: (content: string) => Promise<void>;
}

export function ChatThread({ session, messages, sending, onBack, onSend }: ChatThreadProps) {
    const [input, setInput] = useState("");
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

    const handleSend = async () => {
        if (!input.trim()) return;
        const content = input;
        setInput("");
        try {
            await onSend(content);
        } catch (e) {
            console.error(e);
            setInput(content);
        }
    };

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
        <Box flex safeArea style={{ backgroundColor: theme.colors.background.default }}>
            <Box 
                direction="row" 
                alignItems="center" 
                p="md" 
                style={{ 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.colors.border.subtle,
                    backgroundColor: theme.colors.background.default 
                }}
            >
                <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.default} />
                </TouchableOpacity>
                <Text size="lg" weight="bold" style={{ marginLeft: 16, color: theme.colors.text.default }} numberOfLines={1}>
                    {session?.title || "Chat"}
                </Text>
            </Box>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                renderItem={renderMessage}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <Box 
                    p="md" 
                    style={{ 
                        borderTopWidth: 1, 
                        borderTopColor: theme.colors.border.subtle,
                        backgroundColor: theme.colors.background.default 
                    }} 
                    direction="row" 
                    alignItems="center" 
                    gap="sm"
                >
                    <Input
                        value={input}
                        onChangeText={setInput}
                        placeholder="Type a message..."
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                        containerStyle={{ flex: 1 }}
                        rightAccessory={
                            <Input.Accessory onPress={handleSend} disabled={sending || !input.trim()}>
                                {sending ? (
                                    <ActivityIndicator size="small" color={theme.colors.brand} />
                                ) : (
                                    <Ionicons 
                                        name="send" 
                                        size={20} 
                                        color={input.trim() ? theme.colors.brand : theme.colors.text.subtle} 
                                    />
                                )}
                            </Input.Accessory>
                        }
                    />
                </Box>
            </KeyboardAvoidingView>
        </Box>
    );
}
