import { Box, Text } from "@/src/components/ui/primitives";
import { Input } from "@/src/components/ui/primitives/input";
import { FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage, ChatSession } from "@/src/lib/types";
import { useState } from "react";

interface ChatThreadProps {
    session: ChatSession | null;
    messages: ChatMessage[];
    sending: boolean;
    onBack: () => void;
    onSend: (content: string) => Promise<void>;
}

export function ChatThread({ session, messages, sending, onBack, onSend }: ChatThreadProps) {
    const [input, setInput] = useState("");

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

    return (
        <Box flex safeArea>
            <Box direction="row" alignItems="center" p="md" border="subtle" style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}>
                <TouchableOpacity onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text size="lg" weight="bold" style={{ marginLeft: 16 }} numberOfLines={1}>
                    {session?.title || "Chat"}
                </Text>
            </Box>

            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={{ flexDirection: "column-reverse", padding: 16 }}
                renderItem={({ item }) => {
                    const isUser = item.role === "user";
                    const content = item.parts.find(p => p.type === "text")?.content?.text || "";
                    return (
                        <Box
                            style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "80%" }}
                            background={isUser ? "base" : "subtle"}
                            p="md"
                            rounded="md"
                            mb="sm"
                            mode={isUser ? "primary" : undefined}
                        >
                            <Text inverse={isUser}>{content}</Text>
                        </Box>
                    );
                }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
                <Box p="md" border="subtle" style={{ borderTopWidth: 1, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }} direction="row" alignItems="center" gap="sm">
                    <Input
                        value={input}
                        onChangeText={setInput}
                        placeholder="Type a message..."
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                        rightAccessory={
                            <Input.Accessory onPress={handleSend} disabled={sending || !input.trim()}>
                                {sending ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Ionicons name="send" size={20} color={input.trim() ? "white" : "#666"} />
                                )}
                            </Input.Accessory>
                        }
                    />
                </Box>
            </KeyboardAvoidingView>
        </Box>
    );
}
