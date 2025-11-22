import { Box, Icon, Text } from "@/primitives";
import { Button } from "@/primitives/button";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useMemo } from "react";
import { ActivityIndicator, Animated } from "react-native";
import Avatar from "@/components/ui/avatar";
import { formatWalletAddress } from "@/utils/format";
import {
  successNotification,
  errorNotification,
} from "@/components/utils/haptics";

const formatTokenAmount = (uiAmount: string, decimals: number): string => {
  const amount = Number(uiAmount);

  if (!Number.isFinite(amount) || amount === 0) {
    return "0.00";
  }

  const maxPrecision = Math.min(Math.max(decimals, 4), 8);
  let formatted = amount.toFixed(maxPrecision);

  if (formatted.includes(".")) {
    formatted = formatted.replace(/\.0+$/, ".0");
    formatted = formatted.replace(/\.?(0)+$/, "");
  }

  if (!formatted.includes(".")) {
    formatted += ".00";
  } else {
    const fractional = formatted.split(".")[1] ?? "";
    if (fractional.length < 2) {
      formatted = `${formatted}${"0".repeat(2 - fractional.length)}`;
    }
  }

  return formatted;
};

interface Transaction {
  id: string;
  type: "send" | "receive";
  status: "pending" | "confirmed" | "failed";
  signature: string;
  fromAddress: string;
  toAddress: string;
  mint: string;
  amount: string;
  uiAmount: string;
  decimals: number;
  assetType?: "native" | "spl_token" | string;
  routeId?: string | null;
  invoiceId?: string | null;
  depositId?: string | null;
  description?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date | null;
  userId: string;
  tokenMetadata?: {
    address: string;
    name: string;
    symbol: string;
    image?: string;
  } | null;
}

interface TransactionItemV2Props {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export const TransactionItemV2 = ({
  transaction,
  onPress,
}: TransactionItemV2Props) => {
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const greenBackgroundOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const activityOpacity = useRef(new Animated.Value(1)).current;

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(20)).current;
  const entranceScale = useRef(new Animated.Value(0.95)).current;

  const prevStatusRef = useRef(transaction.status);
  const hasAnimatedEntrance = useRef(false);

  useEffect(() => {
    if (!hasAnimatedEntrance.current) {
      hasAnimatedEntrance.current = true;

      Animated.parallel([
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(entranceTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(entranceScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [entranceOpacity, entranceTranslateY, entranceScale]);

  useEffect(() => {
    const currentStatus = transaction.status;
    const prevStatus = prevStatusRef.current;

    if (prevStatus === "pending" && currentStatus === "confirmed") {
      successNotification();

      Animated.sequence([
        Animated.parallel([
          Animated.timing(iconScaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(activityOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(greenBackgroundOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(iconScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(greenBackgroundOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    if (prevStatus === "pending" && currentStatus === "failed") {
      errorNotification();
    }

    if (currentStatus === "pending") {
      activityOpacity.setValue(1);
      checkmarkOpacity.setValue(0);
      greenBackgroundOpacity.setValue(0);
      iconScaleAnim.setValue(1);
    }

    prevStatusRef.current = currentStatus;
  }, [
    transaction.status,
    iconScaleAnim,
    greenBackgroundOpacity,
    checkmarkOpacity,
    activityOpacity,
  ]);

  const handlePress = () => {
    onPress?.(transaction);
  };

  const formatTimestamp = (transaction: Transaction) => {
    const timestamp = transaction.confirmedAt || transaction.createdAt;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "failed":
        return "error";
      case "pending":
        return "warning";
      default:
        return "muted";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "failed":
        return "Failed";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === "send" ? "arrow-up-right" : "arrow-down-left";
  };

  const getTransactionTitle = (type: string) => {
    return type === "send" ? "Sent" : "Received";
  };

  const transactionStyling = useMemo(() => {
    if (transaction.status === "pending") {
      return {
        backgroundColor: "#F97316",
        isOutgoing: false,
        showAmount: false,
      };
    }
    if (transaction.status === "failed") {
      return {
        backgroundColor: "#DC2626",
        isOutgoing: false,
        showAmount: false,
      };
    }

    if (transaction.type === "send") {
      return {
        backgroundColor: "#DC2626",
        isOutgoing: true,
        showAmount: true,
      };
    } else {
      return {
        backgroundColor: "#059669",
        isOutgoing: false,
        showAmount: true,
      };
    }
  }, [transaction.type, transaction.status]);

  const formattedAmount = formatTokenAmount(
    transaction.uiAmount,
    transaction.decimals ?? 6,
  );

  return (
    <Animated.View
      style={{
        opacity: entranceOpacity,
        transform: [
          { translateY: entranceTranslateY },
          { scale: entranceScale },
        ],
      }}
    >
      <Button
        variant="ghost"
        size="auto"
        onPress={handlePress}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <Box direction="row" alignItems="flex-start">
          <Box style={{ marginRight: 12, position: "relative" }}>
            <Animated.View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: transactionStyling.backgroundColor,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: iconScaleAnim }],
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#10B981",
                  opacity: greenBackgroundOpacity,
                }}
              />
              {transaction.status === "pending" && (
                <Animated.View style={{ opacity: activityOpacity }}>
                  <ActivityIndicator size="small" color="white" />
                </Animated.View>
              )}

              <Animated.View
                style={{
                  opacity: checkmarkOpacity,
                  position: "absolute",
                }}
              >
                <Icon icon={Feather} name="check" size={20} color="white" />
              </Animated.View>

              {transaction.status === "confirmed" && (
                <Animated.View
                  style={{
                    opacity: greenBackgroundOpacity.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 0, 0],
                    }),
                  }}
                >
                  <Icon
                    icon={Feather}
                    name={getTransactionIcon(transaction.type) as any}
                    size={20}
                    color="white"
                  />
                </Animated.View>
              )}

              {transaction.status !== "confirmed" &&
                transaction.status !== "pending" && (
                  <Icon
                    icon={Feather}
                    name={getTransactionIcon(transaction.type) as any}
                    size={20}
                    color="white"
                  />
                )}
            </Animated.View>

            <Box
              style={{
                position: "absolute",
                bottom: 0,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                overflow: "hidden",
                borderColor: "rgba(255,255,255,0.9)",
              }}
            >
              <Avatar
                size={20}
                rounded="full"
                source={{
                  uri: transaction.tokenMetadata?.image || undefined,
                }}
                contentFit="cover"
              />
            </Box>
          </Box>

          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="md"
              weight="semibold"
              numberOfLines={1}
              style={{ marginBottom: 2 }}
            >
              {getTransactionTitle(transaction.type)}
              <Text> {transaction.tokenMetadata?.name || "Token"}</Text>
            </Text>

            <Box style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {transaction.type === "receive" && transaction.fromAddress && (
                <Text size="sm" mode="subtle">
                  From {formatWalletAddress(transaction.fromAddress)}
                </Text>
              )}
              {transaction.type === "send" && transaction.toAddress && (
                <Text size="sm" mode="subtle">
                  To {formatWalletAddress(transaction.toAddress)}
                </Text>
              )}

              {transaction.status !== "confirmed" && (
                <>
                  <Text size="sm" mode="subtle">
                    •
                  </Text>
                  <Text
                    size="sm"
                    mode={getStatusColor(transaction.status) as any}
                    weight="medium"
                  >
                    {getStatusText(transaction.status)}
                  </Text>
                </>
              )}
            </Box>
          </Box>

          <Box style={{ alignItems: "flex-end", marginLeft: 12 }}>
            {transactionStyling.showAmount && (
              <Text
                size="md"
                weight="bold"
                mode={transactionStyling.isOutgoing ? "error" : "success"}
              >
                {transactionStyling.isOutgoing ? "-" : "+"}${formattedAmount}
              </Text>
            )}
            <Text size="sm" mode="subtle" style={{ marginTop: 2 }}>
              {formatTimestamp(transaction)}
            </Text>
          </Box>
        </Box>
      </Button>
    </Animated.View>
  );
};
