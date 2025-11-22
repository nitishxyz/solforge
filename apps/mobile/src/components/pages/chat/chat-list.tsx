import { Box, Text } from "@/src/components/ui/primitives";
import { Button } from "@/src/components/ui/primitives/button";
import { FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatSessionSummary } from "@/src/lib/types";
import { useRouter } from "expo-router";

interface ChatListProps {
    sessions: ChatSessionSummary[];
    loading: boolean;
    onSelectSession: (id: string) => void;
    onCreateSession: () => void;
}

export function ChatList({ sessions, loading, onSelectSession, onCreateSession }: ChatListProps) {
    const router = useRouter();
    return (
        <Box flex p="md" safeArea>
            <Box direction="row" justifyContent="space-between" alignItems="center" mb="md">
                <Text size="xl" weight="bold">Chats</Text>
                <Box direction="row" gap="md">
                    <TouchableOpacity onPress={() => router.push("/settings")}>
                        <Ionicons name="settings-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onCreateSession}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </Box>
            </Box>

            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => onSelectSession(item.id)}>
                            <Box p="md" border="subtle" style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}>
                                <Text size="md" weight="medium" numberOfLines={1}>{item.title || "New Chat"}</Text>
                                <Text size="sm" mode="subtle" numberOfLines={1}>
                                    {item.lastMessage?.preview || "No messages yet"}
                                </Text>
                            </Box>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <Box center p="lg">
                            <Text mode="subtle">No chats yet. Start one!</Text>
                            <Button onPress={onCreateSession} mt="md">
                                <Button.Text>New Chat</Button.Text>
                            </Button>
                        </Box>
                    }
                />
            )}
        </Box>
    );
}
