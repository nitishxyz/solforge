import { Box, Text } from "@/src/components/ui/primitives";
import { useWallet } from "@/src/hooks/use-wallet";
import { useUSDCBalance } from "@/src/hooks/use-usdc-balance";
import { useSolforgeBalance } from "@/src/hooks/use-solforge-balance";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ActivityIndicator, TouchableOpacity, FlatList } from "react-native";
import { useState, useMemo, useEffect } from "react";
import { ChatClient } from "@/src/lib/api";
import { useTransactionsQuery, useSyncTransactionsMutation } from "@/src/hooks/use-transactions";

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

function toSubscript(num: number): string {
    return num.toString().split('').map(d => SUBSCRIPT_DIGITS[parseInt(d)]).join('');
}

function formatCryptoAmount(amountStr: string): string {
    const amount = parseFloat(amountStr);
    if (amount === 0) return "0.00";
    if (amount >= 1) return amount.toFixed(2);

    // Convert to string with high precision to catch small numbers
    // avoiding exponential notation
    const str = amount.toFixed(20).replace(/0+$/, '');
    const parts = str.split('.');
    
    if (parts.length !== 2) return amount.toFixed(2);
    
    const decimalPart = parts[1];
    let zeroCount = 0;
    for (const char of decimalPart) {
        if (char === '0') zeroCount++;
        else break;
    }

    if (zeroCount >= 3) {
        const significant = decimalPart.substring(zeroCount, zeroCount + 4);
        return `0.0${toSubscript(zeroCount)}${significant}`;
    }

    return amount.toFixed(Math.max(4, zeroCount + 2));
}

export function SettingsPage() {
    const router = useRouter();
    const { wallet } = useWallet();
    const { data: balance, isLoading: loadingBalance, refetch } = useUSDCBalance(wallet?.publicKey ?? null);
    const { data: transactions = [], isLoading: loadingTx } = useTransactionsQuery();
    const [copied, setCopied] = useState(false);
    
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

    const { balance: solforgeBalance, isLoading: loadingSolforgeBalance, refetch: refetchSolforge } = useSolforgeBalance(client);

    const { mutate: syncTransactions, isPending: isSyncing } = useSyncTransactionsMutation(client);

    useEffect(() => {
        if (client) {
            syncTransactions();
        }
    }, [client, syncTransactions]);

    const copyAddress = async () => {
        if (wallet?.publicKey) {
            await Clipboard.setStringAsync(wallet.publicKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const renderHeader = () => (
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
                        <TouchableOpacity onPress={() => { refetch(); syncTransactions(); }} disabled={loadingBalance}>
                            {loadingBalance ? <ActivityIndicator size="small" /> : <Ionicons name="refresh" size={20} color="white" />}
                        </TouchableOpacity>
                    </Box>
                </Box>
            </Box>

            <Box>
                <Box background="subtle" p="md" rounded="md" border="subtle">
                    <Box mb="xs">
                        <Text size="sm" mode="subtle">SolForge Balance</Text>
                    </Box>
                    <Box direction="row" alignItems="center" justifyContent="space-between">
                        <Text size="lg" weight="bold">
                            {loadingSolforgeBalance ? <ActivityIndicator size="small" /> : `$${solforgeBalance ?? "0.00"}`}
                        </Text>
                        <TouchableOpacity onPress={() => { refetchSolforge(); syncTransactions(); }} disabled={loadingSolforgeBalance}>
                            {loadingSolforgeBalance ? <ActivityIndicator size="small" /> : <Ionicons name="refresh" size={20} color="white" />}
                        </TouchableOpacity>
                    </Box>
                </Box>
            </Box>

            <Box>
                <Box background="subtle" p="md" rounded="md" border="subtle">
                    <Box mb="xs">
                        <Text size="sm" mode="subtle">Security</Text>
                    </Box>
                    <TouchableOpacity onPress={() => router.push("/export-key")}>
                        <Box direction="row" alignItems="center" justifyContent="space-between">
                            <Text size="md">Export Private Key</Text>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </Box>
                    </TouchableOpacity>
                </Box>
            </Box>

            <Box>
                <Box direction="row" alignItems="center" justifyContent="space-between">
                    <Text size="md" weight="bold">Transactions</Text>
                    {isSyncing && <ActivityIndicator size="small" />}
                </Box>
            </Box>
        </Box>
    );

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

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <Box p="md" border="subtle" style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}>
                        <Box direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Text size="sm" weight="medium">{item.type.toUpperCase()}</Text>
                                <Text size="xs" mode="subtle">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </Box>
                            <Box alignItems="flex-end">
                                <Text size="sm" weight="bold" mode={item.type === 'topup' ? 'success' : undefined}>
                                    {item.type === 'topup' ? '+' : '-'}${formatCryptoAmount(item.amount_usd)}
                                </Text>
                                <Text size="xs" mode="subtle">Confirmed</Text>
                            </Box>
                        </Box>
                    </Box>
                )}
                ListEmptyComponent={
                    (loadingTx || isSyncing) ? (
                        <Box p="lg" center>
                            <ActivityIndicator />
                        </Box>
                    ) : (
                        <Box p="lg" center>
                            <Text mode="subtle">No transactions found</Text>
                        </Box>
                    )
                }
                ListFooterComponent={
                    <Box mt="xl" mb="xl">
                        <Text size="sm" mode="subtle" style={{ textAlign: "center" }}>
                            Solforge Mobile v0.0.1
                        </Text>
                    </Box>
                }
            />
        </Box>
    );
}
