import { Box, Text, Icon } from "@/src/components/ui/primitives";
import Color from "color";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { toast } from "@/src/lib/toast";
import { useUnistyles } from "react-native-unistyles";

interface HomeHeaderProps {
    solforgeBalance: string | null;
    usdcBalance: number | null;
    walletAddress?: string;
}

export function HomeHeader({ solforgeBalance, usdcBalance, walletAddress }: HomeHeaderProps) {
    const { theme } = useUnistyles();

    const balance = usdcBalance ?? 0;
    const isZeroBalance = balance === 0;
    const isLowBalance = balance > 0 && balance < 0.1;
    const showFundingBanner = isZeroBalance || isLowBalance;

    const copyAddress = async () => {
        if (walletAddress) {
            await Clipboard.setStringAsync(walletAddress);
            toast.success("Address copied to clipboard");
        }
    };

    // Helper to generate styles for a banner type
    const getBannerStyles = (type: 'activation' | 'warning') => {
        const isActivation = type === 'activation';
        const baseColor = isActivation ? theme.colors.brand[500] : theme.colors.warning[500];
        const bannerBg = Color(baseColor).alpha(0.1).string();
        const bannerBorder = Color(baseColor).alpha(0.2).string();
        const textColor = isActivation 
            ? (theme.isDark ? theme.colors.brand[300] : theme.colors.brand[800])
            : (theme.isDark ? theme.colors.warning[300] : theme.colors.warning[800]);
        
        const title = isActivation ? "Activate Your Wallet" : "Low Balance Warning";
        const description = isActivation 
            ? "To start using SolForge, please fund your wallet with USDC." 
            : "Your wallet balance is low. You need USDC to pay for transaction fees.";
        
        const iconName = isActivation ? "sparkles" : "warning";
        // We cast to any because Icon expects specific literals but we know these are valid keys
        const iconMode = isActivation ? "brand" : "warning"; 
        
        return { bannerBg, bannerBorder, textColor, title, description, iconName, iconMode };
    };

    const bannerType = isZeroBalance ? 'activation' : 'warning';
    const activeStyles = getBannerStyles(bannerType);

    // Render a banner block
    const renderBanner = (styles: ReturnType<typeof getBannerStyles>) => (
        <Box
            p="md"
            style={{
                backgroundColor: styles.bannerBg,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: styles.bannerBorder
            }}
        >
            <Box direction="row" gap="sm" alignItems="flex-start">
                <Icon icon={Ionicons} name={styles.iconName as any} size={20} color={styles.iconMode as any} />
                <Box flex>
                    <Text weight="medium" mode={styles.iconMode as any}>{styles.title}</Text>
                    <Text size="sm" style={{ color: styles.textColor, marginTop: 4 }}>
                        {styles.description}
                    </Text>

                    {walletAddress && (
                        <Box
                            mt="sm"
                            p="sm"
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            style={{
                                backgroundColor: theme.colors.background.subtle,
                                borderRadius: theme.radius.sm
                            }}
                        >
                            <Text size="xs" font="mono" numberOfLines={1} style={{ flex: 1, marginRight: 8, color: styles.textColor }}>
                                {walletAddress}
                            </Text>
                            <TouchableOpacity onPress={copyAddress}>
                                <Box direction="row" alignItems="center" gap="xs" style={{ backgroundColor: theme.colors.background.default, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                    <Icon icon={Ionicons} name="copy-outline" size={12} color={styles.textColor} />
                                    <Text size="xs" weight="medium" style={{ color: styles.textColor }}>Copy</Text>
                                </Box>
                            </TouchableOpacity>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box gap="md" mb="md">
            <Box direction="row" gap="sm">
                {/* SolForge Balance Card */}
                <Box
                    flex
                    p="md"
                    border="subtle"
                    style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.background.card }}
                >
                    <Box direction="row" alignItems="center" gap="xs" mb="xs">
                        <Icon icon={Ionicons} name="flash" size={16} />
                        <Text size="sm" weight="medium">SolForge</Text>
                    </Box>
                    <Text size="xl" weight="bold" font="mono">
                        ${solforgeBalance ? parseFloat(solforgeBalance).toFixed(4) : "0.0000"}
                    </Text>
                    <Text size="xs" mode="subtle">Credits</Text>
                </Box>

                {/* USDC Balance Card */}
                <Box
                    flex
                    p="md"
                    border="subtle"
                    style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.background.card }}
                >
                    <Box direction="row" alignItems="center" gap="xs" mb="xs">
                        <Icon icon={Ionicons} name="wallet" size={16} />
                        <Text size="sm" weight="medium">USDC</Text>
                    </Box>
                    <Text size="xl" weight="bold" font="mono">
                        ${usdcBalance ? usdcBalance.toFixed(4) : "0.0000"}
                    </Text>
                    <Text size="xs" mode="subtle">Wallet Balance</Text>
                </Box>
            </Box>

            {/* Funding/Activation Banner */}
            {showFundingBanner && renderBanner(activeStyles)}
        </Box>
    );
}
