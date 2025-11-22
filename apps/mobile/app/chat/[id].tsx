import { Box, Text } from "@/src/components/ui/primitives";
import { useWallet } from "@/src/hooks/use-wallet";
import { useChat } from "@/src/hooks/use-chat";
import { ChatClient } from "@/src/lib/api";
import { useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { ChatThread } from "@/src/components/pages/chat/chat-thread";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ChatThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { wallet, loading: walletLoading } = useWallet();

    const client = useMemo(() => {
        if (!wallet) return null;
        return new ChatClient({
            wallet: {
                publicKey: wallet.publicKey,
                secretKey: wallet.secretKey,
                signNonce: wallet.signNonce,
            },
        });
    }, [wallet]);

    const {
        activeSession,
        messages,
        sending,
        sendMessage,
    } = useChat({ client, sessionId: id, autoSelectFirst: false });

    if (walletLoading) {
        return (
            <Box flex center background="base">
                <ActivityIndicator size="large" />
                <Box mt="md">
                    <Text>Loading wallet...</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flex background="base">
            <ChatThread
                session={activeSession}
                messages={messages}
                sending={sending}
                onBack={() => router.back()}
                onSend={async (content) => { await sendMessage(content); }}
            />
        </Box>
    );
}
