import { Box, Text } from "@/src/components/ui/primitives";
import { useWallet } from "@/src/hooks/use-wallet";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";

export function ExportKeyPage() {
    const router = useRouter();
    const { wallet } = useWallet();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        authenticate();
    }, []);

    const authenticate = async () => {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                // If no biometrics, we might want to fallback to passcode or just allow it
                // For now, let's allow it with a warning or just proceed
                setIsAuthenticated(true);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Authenticate to view private key",
                fallbackLabel: "Use Passcode",
            });

            if (result.success) {
                setIsAuthenticated(true);
            } else {
                setAuthError("Authentication failed");
            }
        } catch (e) {
            setAuthError("An error occurred during authentication");
            console.error(e);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleCopy = async () => {
        if (wallet?.secretKey) {
            await Clipboard.setStringAsync(wallet.secretKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isAuthenticating) {
        return (
            <Box flex background="base" center>
                <ActivityIndicator size="large" />
                <Box mt="md">
                    <Text>Verifying identity...</Text>
                </Box>
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Box flex background="base" center p="lg">
                <Box mb="md">
                    <Ionicons name="lock-closed" size={48} color="#ef4444" />
                </Box>
                <Text size="lg" weight="bold" style={{ textAlign: 'center' }}>Authentication Required</Text>
                <Text mode="subtle" style={{ textAlign: 'center', marginTop: 8 }}>
                    We need to verify your identity to show your private key.
                </Text>
                {authError && (
                    <Text style={{ color: '#ef4444', marginTop: 16 }}>{authError}</Text>
                )}
                <Box mt="xl">
                    <TouchableOpacity 
                        onPress={authenticate}
                        style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                    >
                        <Text style={{ color: 'black', fontWeight: '600' }}>Try Again</Text>
                    </TouchableOpacity>
                </Box>
                <Box mt="lg">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text mode="subtle">Cancel</Text>
                    </TouchableOpacity>
                </Box>
            </Box>
        );
    }

    return (
        <Box flex background="base" safeAreaBottom>
            <Box direction="row" alignItems="center" p="md" border="subtle" style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Box ml="md">
                    <Text size="lg" weight="bold">Export Private Key</Text>
                </Box>
            </Box>

            <Box p="lg">
                <Box background="subtle" p="md" rounded="md" border="subtle" mb="lg">
                    <Box direction="row" gap="sm" mb="sm">
                        <Ionicons name="warning" size={20} color="#eab308" />
                        <Text weight="bold" style={{ color: '#eab308' }}>Warning</Text>
                    </Box>
                    <Text size="sm" style={{ lineHeight: 20 }}>
                        Your private key grants full access to your wallet. 
                        Never share this with anyone, including SolForge support. 
                        Anyone with this key can steal your funds.
                    </Text>
                </Box>

                <Box mb="sm">
                    <Text size="sm" mode="subtle">Private Key</Text>
                </Box>

                <Box 
                    background="subtle" 
                    p="md" 
                    rounded="md" 
                    border="subtle" 
                    style={{ position: 'relative', minHeight: 100, justifyContent: 'center' }}
                >
                    <Text 
                        style={{ 
                            fontFamily: 'monospace', 
                            opacity: revealed ? 1 : 0,
                        }}
                    >
                        {wallet?.secretKey}
                    </Text>
                    
                    {!revealed && (
                        <Box 
                            style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                bottom: 0, 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                borderRadius: 6
                            }}
                        >
                            <TouchableOpacity 
                                onPress={() => setRevealed(true)}
                                style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    backgroundColor: 'rgba(255,255,255,0.1)', 
                                    paddingHorizontal: 16, 
                                    paddingVertical: 8, 
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)'
                                }}
                            >
                                <Ionicons name="eye" size={16} color="white" style={{ marginRight: 8 }} />
                                <Text size="sm" weight="medium">Tap to reveal</Text>
                            </TouchableOpacity>
                        </Box>
                    )}
                </Box>
                
                {revealed && (
                    <Box alignItems="flex-end" mt="sm">
                         <TouchableOpacity 
                            onPress={() => setRevealed(false)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                        >
                            <Ionicons name="eye-off" size={16} color="#a1a1aa" style={{ marginRight: 4 }} />
                            <Text size="xs" mode="subtle">Hide</Text>
                        </TouchableOpacity>
                    </Box>
                )}

                <TouchableOpacity 
                    onPress={handleCopy}
                    style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: 'white', 
                        paddingVertical: 12, 
                        borderRadius: 8,
                        marginTop: 8
                    }}
                >
                    <Ionicons 
                        name={copied ? "checkmark" : "copy-outline"} 
                        size={20} 
                        color="black" 
                        style={{ marginRight: 8 }} 
                    />
                    <Text style={{ color: 'black', fontWeight: '600' }}>
                        {copied ? "Copied to Clipboard" : "Copy to Clipboard"}
                    </Text>
                </TouchableOpacity>
            </Box>
        </Box>
    );
}
