import { Box, Text } from "@/src/components/ui/primitives";
import { useWallet } from "@/src/hooks/use-wallet";
import { useChat } from "@/src/hooks/use-chat";
import { ChatClient } from "@/src/lib/api";
import { useSolforgeBalance } from "@/src/hooks/use-solforge-balance";
import { useUSDCBalance } from "@/src/hooks/use-usdc-balance";
import { useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { ChatList } from "@/src/components/pages/chat/chat-list";
import { useRouter } from "expo-router";
import { toast } from "@/src/lib/toast";

export default function ChatListScreen() {
    const { wallet, loading: walletLoading } = useWallet();
    const router = useRouter();

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

    const { balance: solforgeBalance } = useSolforgeBalance(client);
    const { data: usdcBalance } = useUSDCBalance(wallet?.publicKey ?? null);

    const {
        sessions,
        loadingSessions,
        createSession,
        isCreating,
    } = useChat({ client, autoSelectFirst: false });

    const handleCreateSession = async () => {
        const toastId = toast.loading("Creating new session...");
        try {
            const session = await createSession({
                agent: "solforge",
                provider: "openai",
                model: "gpt-4o-mini",
                projectPath: "workspace",
            });
            toast.success("Session created!", { id: toastId, duration: 2000 });
            // Navigate to the new session
            router.push(`/chat/${session.id}`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to create session", { id: toastId });
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
            <ChatList
                sessions={sessions}
                loading={loadingSessions}
                isCreating={isCreating}
                onSelectSession={(id) => router.push(`/chat/${id}`)}
                onCreateSession={handleCreateSession}
                solforgeBalance={solforgeBalance}
                usdcBalance={usdcBalance ?? null}
                walletAddress={wallet?.publicKey}
            />
        </Box>
    );
}
