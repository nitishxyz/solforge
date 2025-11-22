import React, { memo } from "react";
import { View, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Icon } from "@/components/ui/primitives";
import { Ionicons } from "@expo/vector-icons";

interface UserMessageProps {
  content: string;
  createdAt?: Date;
}

function formatTime(date?: Date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const UserMessage = memo(function UserMessage({ content, createdAt }: UserMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerText}>You</Text>
          {createdAt && <Text style={styles.timeText}>· {formatTime(createdAt)}</Text>}
        </View>
        
        <View style={styles.bubble}>
          <Text style={styles.messageText}>{content}</Text>
        </View>
      </View>
      
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Icon 
            icon={Ionicons} 
            name="person" 
            size={14} 
            color={styles.avatarIcon.color} 
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  headerText: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.xs,
    fontWeight: '500',
    color: theme.colors.chatUserText.base,
  },
  timeText: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.subtle,
  },
  bubble: {
    backgroundColor: theme.colors.chatUserBg.base,
    borderColor: theme.colors.chatUserBorder.base,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  messageText: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  avatarContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.chatUserBg.base,
    borderColor: theme.colors.chatUserBorder.base,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    color: theme.colors.chatUserText.base,
  },
}));
