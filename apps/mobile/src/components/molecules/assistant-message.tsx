import React, { memo } from "react";
import { View, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Icon } from "@/components/ui/primitives";
import { Ionicons } from "@expo/vector-icons";

interface AssistantMessageProps {
  content: string;
  createdAt?: Date;
  isLoading?: boolean;
  agent?: string;
  provider?: string;
  model?: string;
}

function formatTime(date?: Date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AssistantMessage = memo(function AssistantMessage({ 
  content, 
  createdAt, 
  isLoading,
  agent,
  provider,
  model
}: AssistantMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarBadge}>
          <View style={styles.avatar}>
            <Icon 
              icon={Ionicons} 
              name="sparkles" 
              size={14} 
              color={styles.avatarIcon.color} 
            />
          </View>
          
          <View style={styles.headerInfo}>
            {agent && (
              <Text style={styles.agentName}>{agent}</Text>
            )}
            
            {agent && provider && (
              <Text style={styles.separator}>·</Text>
            )}
            
            {provider && (
              <Text style={styles.metadataText}>{provider}</Text>
            )}
            
            {model && (
              <Text style={styles.separator}>·</Text>
            )}
            
            {model && (
              <Text style={styles.metadataText}>{model}</Text>
            )}

            {createdAt && (
              <Text style={styles.separator}>·</Text>
            )}
            
            {createdAt && (
              <Text style={styles.metadataText}>{formatTime(createdAt)}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.gutter}>
            <View style={styles.line} />
            <View style={styles.miniIconWrapper}>
                <Icon 
                    icon={Ionicons} 
                    name="sparkles" 
                    size={10} 
                    color={styles.miniIcon.color} 
                />
            </View>
        </View>
        <View style={styles.contentWrapper}>
          {isLoading ? (
             <View style={styles.loadingContainer}>
                 <Text style={styles.loadingText}>Thinking...</Text>
             </View>
          ) : (
            <Text style={styles.messageText}>{content}</Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingVertical: theme.spacing.md,
  },
  header: {
    marginBottom: 0, // Removed margin to let gutter handle spacing
    zIndex: 2,
  },
  avatarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.chatAssistantBg.base,
    borderColor: theme.colors.chatAssistantBorder.base,
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingRight: theme.spacing.md,
    alignSelf: 'flex-start',
    zIndex: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.chatAssistantBorder.base, 
    borderColor: theme.colors.chatAssistantPrimary.base,
    borderWidth: 1,
    marginRight: theme.spacing.sm,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  agentName: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.xs,
    fontWeight: '500',
    color: theme.colors.chatAssistantText.base,
  },
  metadataText: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.subtle,
  },
  separator: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.subtle,
    marginHorizontal: 4,
  },
  contentRow: {
      flexDirection: 'row',
      minHeight: 20,
  },
  gutter: {
      width: 34, // Match avatar width (32) + border roughly
      alignItems: 'center',
      paddingTop: 4, // Gap between header and thread start
  },
  line: {
      position: 'absolute',
      top: 0,
      height: 16, // Extend only to the center of the first icon (paddingTop:4 + marginTop:2 + halfHeight:10 = 16)
      width: 2,
      backgroundColor: theme.colors.chatAssistantBorder.base,
      opacity: 0.3,
      left: 16, // Center of 32px avatar
      marginLeft: -1, // Center the 2px line
  },
  miniIconWrapper: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1, // On top of line
      marginTop: 2, // Push down slightly
  },
  contentWrapper: {
    flex: 1,
    paddingLeft: theme.spacing.sm,
    paddingTop: 4, // Align text with mini icon
  },
  messageText: {
    fontFamily: theme.typography.family.sans,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.default,
    lineHeight: 22,
  },
  loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
  },
  loadingText: {
      fontFamily: theme.typography.family.sans,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text.subtle,
      fontStyle: 'italic',
  },
  avatarIcon: {
      color: theme.colors.chatAssistantText.base,
  },
  miniIcon: {
      color: theme.colors.chatAssistantText.base,
  }
}));
