import { Box, Text } from "@/src/components/ui/primitives";
import { Button } from "@/src/components/ui/primitives/button";
import { FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChatSessionSummary } from "@/src/lib/types";
import { useRouter } from "expo-router";
import { useUnistyles } from "react-native-unistyles";
import { HomeHeader } from "./home-header";

interface ChatListProps {
    sessions: ChatSessionSummary[];
    loading: boolean;
    isCreating?: boolean;
    onSelectSession: (id: string) => void;
    onCreateSession: () => void;
    solforgeBalance: string | null;
    usdcBalance: number | null;
    walletAddress?: string;
}

export function ChatList({
    sessions,
    loading,
    isCreating,
    onSelectSession,
    onCreateSession,
    solforgeBalance,
    usdcBalance,
    walletAddress
}: ChatListProps) {
    const router = useRouter();
    const { theme } = useUnistyles();
    const iconColor = theme.colors.text.default;

    return (
        <Box flex p="md" safeArea>
            <Box direction="row" justifyContent="space-between" alignItems="center" mb="md">
                <Text size="xl" weight="bold">Chats</Text>
                <Box direction="row" gap="md">
                    <TouchableOpacity onPress={() => router.push("/settings")}>
                        <Ionicons name="settings-outline" size={24} color={iconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onCreateSession} disabled={isCreating}>
                        {isCreating ? (
                            <ActivityIndicator size="small" color={iconColor} />
                        ) : (
                            <Ionicons name="add" size={24} color={iconColor} />
                        )}
                    </TouchableOpacity>
                </Box>
            </Box>

            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={sessions}
                    ListHeaderComponent={
                        <Box mb="sm">
                            <HomeHeader
                                solforgeBalance={solforgeBalance}
                                usdcBalance={usdcBalance}
                                walletAddress={walletAddress}
                            />
                        </Box>
                    }
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
                            <Button onPress={onCreateSession} mt="md" loading={isCreating}>
                                <Button.Text>New Chat</Button.Text>
                            </Button>
                        </Box>
                    }
                />
            )}
        </Box>
    );
}
