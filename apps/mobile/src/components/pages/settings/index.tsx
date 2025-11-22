import { Box, Text } from "@/src/components/ui/primitives";
import { Button } from "@/src/components/ui/primitives/button";
import { useWallet } from "@/src/hooks/use-wallet";
import { useUSDCBalance } from "@/src/hooks/use-usdc-balance";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { useState } from "react";

export function SettingsPage() {
    const router = useRouter();
    const { wallet } = useWallet();
    const { data: balance, isLoading: loadingBalance, refetch } = useUSDCBalance(wallet?.publicKey ?? null);
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (wallet?.publicKey) {
            await Clipboard.setStringAsync(wallet.publicKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Box flex background="base" safeArea>
            <Box direction="row" alignItems="center" p="md" border="subtle" style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Box ml="md">
                    <Text size="lg" weight="bold">Settings</Text>
                </Box>
            </Box>

            <Box p="md" gap="lg">
                <Box>
                    <Box mb="sm">
                        <Text size="md" weight="bold">Wallet</Text>
                    </Box>
                    <Box background="subtle" p="md" rounded="md" border="subtle">
                        <Box mb="xs">
                            <Text size="sm" mode="subtle">Address</Text>
                        </Box>
                        <Box direction="row" alignItems="center" justifyContent="space-between" gap="sm">
                            <Text size="sm" style={{ flex: 1 }} numberOfLines={1} ellipsizeMode="middle">
                                {wallet?.publicKey || "Loading..."}
                            </Text>
                            <TouchableOpacity onPress={copyAddress}>
                                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={20} color="white" />
                            </TouchableOpacity>
                        </Box>
                    </Box>
                </Box>

                <Box>
                    <Box background="subtle" p="md" rounded="md" border="subtle">
                        <Box mb="xs">
                            <Text size="sm" mode="subtle">USDC Balance</Text>
                        </Box>
                        <Box direction="row" alignItems="center" justifyContent="space-between">
                            <Text size="lg" weight="bold">
                                {loadingBalance ? <ActivityIndicator size="small" /> : `${balance?.toFixed(2) ?? "0.00"} USDC`}
                            </Text>
                            <TouchableOpacity onPress={() => refetch()}>
                                <Ionicons name="refresh" size={20} color="white" />
                            </TouchableOpacity>
                        </Box>
                    </Box>
                </Box>

                <Box mt="xl">
                    <Text size="sm" mode="subtle" style={{ textAlign: "center" }}>
                        Solforge Mobile v0.0.1
                    </Text>
                </Box>
            </Box>
        </Box>
    );
}
