import { Box, Text } from "@/src/components/ui/primitives";
import { useWallet } from "@/src/hooks/use-wallet";
import { useChat } from "@/src/hooks/use-chat";
import { ChatClient } from "@/src/lib/api";
import { useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { ChatList } from "./chat-list";
import { ChatThread } from "./chat-thread";

export function ChatPage() {
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
        sessions,
        activeSession,
        messages,
        selectedSessionId,
        loadingSessions,
        sending,
        createSession,
        selectSession,
        sendMessage,
    } = useChat({ client });

    const handleCreateSession = async () => {
        try {
            await createSession({
                agent: "solforge",
                provider: "openai",
                model: "gpt-4o-mini",
                projectPath: "workspace",
            });
        } catch (e) {
            console.error(e);
        }
    };

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
            {!selectedSessionId ? (
                <ChatList
                    sessions={sessions}
                    loading={loadingSessions}
                    onSelectSession={selectSession}
                    onCreateSession={handleCreateSession}
                />
            ) : (
                <ChatThread
                    session={activeSession}
                    messages={messages}
                    sending={sending}
                    onBack={() => selectSession("")}
                    onSend={async (content) => { await sendMessage(content); }}
                />
            )}
        </Box>
    );
}
