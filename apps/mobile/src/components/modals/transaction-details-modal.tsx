import React, { forwardRef, useMemo } from "react";
import GorhomPopupSheet, {
  type GorhomPopupSheetRef,
} from "@/components/ui/gorhom-popup-sheet";
import { Box, Text, Icon } from "@/primitives";
import { Button } from "@/primitives/button";
import { Feather } from "@expo/vector-icons";
import Avatar from "@/components/ui/avatar";
import { formatWalletAddress } from "@/utils/format";
import { lamportsToUiAmount } from "@/utils/token-amounts";
import { useLocalTokenByAddress } from "@/services/api/local/tokens";
import { useInvoiceById } from "@/services/api/local/invoices";
import { useDepositById } from "@/services/api/local/deposits";
import { useRouteById } from "@/services/api/local/routes";
import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";
import { useSonner } from "@/hooks/use-sonner";

import type { TransactionWithMetadata } from "@/services/api/remote/sync-transactions";

type Transaction = TransactionWithMetadata & {
  metadata?: Record<string, any> | null;
  blockTime?: Date | null;
  errorMessage?: string | null;
  tokenMint?: string | null;
};

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  onDismiss?: () => void;
}

const TransactionDetailsModal = forwardRef<
  GorhomPopupSheetRef,
  TransactionDetailsModalProps
>(({ transaction, onDismiss }, ref) => {
  const { data: localToken } = useLocalTokenByAddress(
    transaction?.mint ?? ""
  );
  const { data: invoice } = useInvoiceById(transaction?.invoiceId || "");
  const { data: deposit } = useDepositById(transaction?.depositId || "");
  const { data: route } = useRouteById(transaction?.routeId || "");

  const tokenInfo = useMemo(() => {
    if (transaction?.tokenMetadata) {
      return transaction.tokenMetadata;
    }

    if (localToken) {
      return {
        address: localToken.address,
        name: localToken.name || localToken.token?.name || "Token",
        symbol: localToken.symbol || localToken.token?.symbol || "",
        image: localToken.token?.image || undefined,
      };
    }

    return null;
  }, [transaction?.tokenMetadata, localToken]);

  const tokenDecimals = useMemo(() => {
    if (transaction?.decimals != null) {
      return transaction.decimals;
    }

    if (typeof localToken?.decimals === "number") {
      return localToken.decimals;
    }

    if (typeof localToken?.token?.decimals === "number") {
      return localToken.token.decimals;
    }

    return 6;
  }, [transaction?.decimals, localToken]);

  const normalizedType = useMemo(() => {
    if (!transaction) return "unknown";

    const metadata = transaction.metadata as
      | { type?: string; category?: string; subtype?: string }
      | undefined
      | null;

    if (metadata?.type) {
      return metadata.type;
    }

    if (metadata?.category) {
      return metadata.category;
    }

    if (transaction.type === "send") {
      return "outgoing_transfer";
    }

    if (transaction.type === "receive") {
      return "incoming_transfer";
    }

    return transaction.type ?? "unknown";
  }, [transaction]);

  const showTokenAvatar =
    !!tokenInfo?.image &&
    !["account_creation", "route_creation", "program_interaction"].includes(
      normalizedType,
    );

  // Format amount for display
  const formattedAmount = useMemo(() => {
    if (!transaction) return "0.00";

    const decimalPlaces = tokenDecimals === 9 ? 4 : 2;
    const amountFromUi = transaction.uiAmount
      ? Number(transaction.uiAmount)
      : null;

    if (amountFromUi != null && Number.isFinite(amountFromUi)) {
      return amountFromUi.toLocaleString("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    }

    if (transaction.amount) {
      const uiAmount = Number(
        lamportsToUiAmount(transaction.amount, tokenDecimals),
      );

      if (Number.isFinite(uiAmount)) {
        return uiAmount.toLocaleString("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
      }
    }

    return "0.00";
  }, [transaction, tokenDecimals]);

  // Format timestamp
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Unknown";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "failed":
        return "error";
      case "pending":
      case "sending":
      case "confirming":
        return "warning";
      default:
        return "muted";
    }
  };

  // Get transaction title (matching TransactionItemV2)
  const getTransactionTitle = (type: string, metadata?: any) => {
    switch (type) {
      case "send":
      case "outgoing_transfer":
        return "Sent";
      case "receive":
      case "incoming_transfer":
        return "Received";
      case "transfer":
        const subtype = metadata?.subtype;
        if (subtype === "incoming_transfer") {
          return "Received";
        } else {
          return "Sent";
        }
      case "mint":
        return "Minted";
      case "deposit":
        return "Deposited";
      case "withdrawal":
        return "Withdrew";
      case "swap":
        return "Swapped";
      case "trade":
        return "Traded";
      case "fee":
        return "Network Fee";
      case "stake":
        return "Staked";
      case "reward":
        return "Reward Earned";
      case "program_interaction":
        return "Smart Contract";
      case "account_creation":
        return "Welcome to Soljar!";
      case "route_creation":
        return "Route Created";
      case "unknown":
        return "Transaction";
      default:
        return type
          ? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
          : "Transaction";
    }
  };

  // Get transaction styling (matching TransactionItemV2)
  const transactionStyling = useMemo(() => {
    if (!transaction) {
      return {
        backgroundColor: "#6B7280",
        isOutgoing: false,
        showAmount: false,
      };
    }

    if (
      transaction.status === "pending" ||
      transaction.status === "sending" ||
      transaction.status === "confirming"
    ) {
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

    const metadata = transaction.metadata as
      | { subtype?: string }
      | undefined
      | null;

    switch (normalizedType) {
      case "outgoing_transfer":
      case "send":
      case "withdrawal":
      case "fee":
        return {
          backgroundColor: "#DC2626",
          isOutgoing: true,
          showAmount: true,
        };
      case "incoming_transfer":
      case "receive":
      case "deposit":
      case "mint":
      case "reward":
        return {
          backgroundColor: "#059669",
          isOutgoing: false,
          showAmount: true,
        };
      case "swap":
        return {
          backgroundColor: "#7C3AED",
          isOutgoing: false,
          showAmount: false,
        };
      case "stake":
        return {
          backgroundColor: "#2563EB",
          isOutgoing: false,
          showAmount: true,
        };
      case "transfer":
        if (metadata?.subtype === "incoming_transfer") {
          return {
            backgroundColor: "#10B981",
            isOutgoing: false,
            showAmount: true,
          };
        }
        return {
          backgroundColor: "#EF4444",
          isOutgoing: true,
          showAmount: true,
        };
      case "program_interaction":
        return {
          backgroundColor: "#6B7280",
          isOutgoing: false,
          showAmount: false,
        };
      case "account_creation":
        return {
          backgroundColor: "#2563EB",
          isOutgoing: false,
          showAmount: false,
        };
      case "route_creation":
        return {
          backgroundColor: "#7C3AED",
          isOutgoing: false,
          showAmount: false,
        };
      default:
        return {
          backgroundColor: "#6B7280",
          isOutgoing: false,
          showAmount: false,
        };
    }
  }, [transaction, normalizedType]);

  // Table row component for clean layout
  const TableRow = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress?: () => void;
  }) => (
    <Button variant="ghost" size="auto" onPress={onPress} disabled={!onPress}>
      <Box
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flex
        pt="sm"
        pb="sm"
      >
        <Text size="md" mode="subtle" weight="bold">
          {label}
        </Text>
        <Box
          direction="row"
          alignItems="center"
          gap="sm"
          flex
          style={{ justifyContent: "flex-end" }}
        >
          <Text
            size="md"
            weight="medium"
            numberOfLines={1}
            style={{ textAlign: "right" }}
          >
            {value}
          </Text>
          {onPress && (
            <Icon icon={Feather} name="copy" size={12} mode="disabled" />
          )}
        </Box>
      </Box>
    </Button>
  );

  const sonner = useSonner();

  // Get transaction icon (matching TransactionItemV2)
  const getTransactionIcon = (type: string, metadata?: any) => {
    switch (type) {
      case "send":
      case "outgoing_transfer":
        return "arrow-up-right";
      case "receive":
      case "incoming_transfer":
        return "arrow-down-left";
      case "transfer":
        const subtype = metadata?.subtype;
        if (subtype === "incoming_transfer") {
          return "arrow-down-left";
        } else {
          return "arrow-up-right";
        }
      case "mint":
        return "droplet";
      case "deposit":
        return "trending-up";
      case "withdrawal":
        return "trending-down";
      case "swap":
        return "repeat";
      case "trade":
        return "bar-chart-2";
      case "fee":
        return "credit-card";
      case "stake":
        return "lock";
      case "reward":
        return "award";
      case "program_interaction":
        return "zap";
      case "account_creation":
        return "check-circle";
      case "route_creation":
        return "package";
      case "unknown":
        return "help-circle";
      default:
        return "activity";
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    sonner.success(`${label} copied`, {
      duration: 2000,
    });
  };

  // Open in explorer
  const openInExplorer = async () => {
    if (!transaction) return;

    const signature = transaction.signature;
    if (!signature) return;

    const explorerUrl = `https://solscan.io/tx/${signature}`;
    await Linking.openURL(explorerUrl);
  };

  if (!transaction) return null;

  const signature = transaction.signature;

  return (
    <GorhomPopupSheet ref={ref} onDismiss={onDismiss}>
      {/* Modern Transaction Header */}
      <Box alignItems="center" gap="md">
        {/* Transaction Visual - Token Avatar or Colored Icon */}
        {showTokenAvatar ? (
          <Avatar size={64} source={{ uri: tokenInfo?.image }} />
        ) : (
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: transactionStyling.backgroundColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              icon={Feather}
              name={getTransactionIcon(normalizedType, transaction?.metadata) as any}
              size={32}
              color="white"
            />
          </Box>
        )}

        {/* Transaction Type with Token */}
        <Text size="lg" weight="semibold">
          {getTransactionTitle(normalizedType, transaction?.metadata)}
          {!["account_creation", "route_creation", "program_interaction"].includes(
            normalizedType
          ) &&
            tokenInfo && (
              <Text> {tokenInfo.symbol || tokenInfo.name}</Text>
            )}
        </Text>

        {/* Status Badge */}
        <Box
          p="xs"
          rounded="full"
          style={{
            backgroundColor:
              transaction.status === "confirmed"
                ? "rgba(5, 150, 105, 0.1)"
                : transaction.status === "failed"
                ? "rgba(220, 38, 38, 0.1)"
                : "rgba(249, 115, 22, 0.1)",
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <Text
            size="xs"
            weight="medium"
            mode={getStatusColor(transaction.status) as any}
          >
            {transaction.status.charAt(0).toUpperCase() +
              transaction.status.slice(1)}
          </Text>
        </Box>

        {/* Amount at Bottom */}
        {transactionStyling.showAmount && formattedAmount !== "0.00" && (
          <Text
            size="giga"
            weight="bold"
            mode={transactionStyling.isOutgoing ? "error" : "success"}
          >
            {transactionStyling.isOutgoing ? "-" : "+"}${formattedAmount}
          </Text>
        )}
      </Box>

      {/* Transaction Details Table */}
      <Box gap="xs">
        {/* From Address */}
        {transaction.fromAddress && (
          <TableRow
            label="From"
            value={formatWalletAddress(transaction.fromAddress)}
            onPress={() =>
              copyToClipboard(transaction.fromAddress, "Sender address")
            }
          />
        )}

        {/* To Address */}
        {transaction.toAddress && (
          <TableRow
            label="To"
            value={formatWalletAddress(transaction.toAddress)}
            onPress={() =>
              copyToClipboard(transaction.toAddress, "Recipient address")
            }
          />
        )}

        {/* Date */}
        <TableRow
          label="Date"
          value={formatDate(transaction.confirmedAt || transaction.createdAt)}
        />

        {/* Signature */}
        {signature && (
          <TableRow
            label="Signature"
            value={formatWalletAddress(signature)}
            onPress={() => copyToClipboard(signature, "Transaction signature")}
          />
        )}

        {/* Invoice Details */}
        {invoice && (
          <>
            <TableRow
              label="Invoice Amount"
              value={`${invoice.amount} ${tokenInfo?.symbol || ""}`}
            />
            <TableRow
              label="Invoice Status"
              value={invoice.isPaid ? "Paid" : "Unpaid"}
            />
            {invoice.description && (
              <TableRow label="Description" value={invoice.description} />
            )}
          </>
        )}

        {/* Jar/Route Details */}
        {deposit && route && (
          <>
            <TableRow label="Jar" value={route.title || "Unnamed Jar"} />
            <TableRow
              label="Deposit Amount"
              value={`${deposit.amount} ${tokenInfo?.symbol || ""}`}
            />
            {route.description && (
              <TableRow label="Jar Description" value={route.description} />
            )}
          </>
        )}

        {/* Description */}
        {transaction.description && (
          <TableRow label="Description" value={transaction.description} />
        )}

        {/* Error Message */}
        {transaction.errorMessage && (
          <TableRow label="Error" value={transaction.errorMessage} />
        )}
      </Box>

      {/* Actions */}
      {signature && transaction.status === "confirmed" && (
        <Box pt="sm">
          <Button
            size="lg"
            mode="subtle"
            rounded="full"
            onPress={openInExplorer}
          >
            <Button.Icon>
              {(props) => (
                <Icon {...props} icon={Feather} name="external-link" />
              )}
            </Button.Icon>
            <Button.Text weight="bold">View on Explorer</Button.Text>
          </Button>
        </Box>
      )}
    </GorhomPopupSheet>
  );
});

TransactionDetailsModal.displayName = "TransactionDetailsModal";

export default TransactionDetailsModal;
