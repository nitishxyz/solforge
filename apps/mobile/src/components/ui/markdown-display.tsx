import React, { memo } from "react";
import Markdown from "react-native-markdown-display";
import { useUnistyles } from "react-native-unistyles";
import { View } from "react-native";

interface MarkdownDisplayProps {
  children: string;
  textColor?: string;
}

export const MarkdownDisplay = memo(function MarkdownDisplay({ 
  children,
  textColor 
}: MarkdownDisplayProps) {
  const { theme } = useUnistyles();
  const defaultColor = textColor || theme.colors.text.default;

  return (
    <View>
      <Markdown
        style={{
          body: {
            color: defaultColor,
            fontSize: theme.typography.size.lg,
            fontFamily: theme.typography.family.sans,
            lineHeight: 24,
          },
          paragraph: {
            color: defaultColor,
            fontSize: theme.typography.size.lg,
            fontFamily: theme.typography.family.sans,
            lineHeight: 24,
            marginVertical: 0,
            marginBottom: 8,
          },
          heading1: {
            color: defaultColor,
            fontSize: theme.typography.size.xxl,
            fontFamily: theme.typography.family.sans,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 8,
          },
          heading2: {
            color: defaultColor,
            fontSize: theme.typography.size.xl,
            fontFamily: theme.typography.family.sans,
            fontWeight: '600',
            marginTop: 12,
            marginBottom: 8,
          },
          heading3: {
            color: defaultColor,
            fontSize: theme.typography.size.lg,
            fontFamily: theme.typography.family.sans,
            fontWeight: '600',
            marginTop: 8,
            marginBottom: 8,
          },
          code_inline: {
            color: theme.colors.brand.base,
            backgroundColor: theme.colors.background.subtle,
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 2,
            fontFamily: theme.typography.family.mono,
            fontSize: theme.typography.size.md,
          },
          code_block: {
            color: theme.colors.text.default,
            backgroundColor: theme.colors.background.subtle,
            borderRadius: 8,
            padding: 12,
            marginVertical: 8,
            fontFamily: theme.typography.family.mono,
            fontSize: theme.typography.size.md,
          },
          fence: {
            color: theme.colors.text.default,
            backgroundColor: theme.colors.background.subtle,
            borderRadius: 8,
            padding: 12,
            marginVertical: 8,
            fontFamily: theme.typography.family.mono,
            fontSize: theme.typography.size.md,
          },
          link: {
            color: theme.colors.brand.base,
            textDecorationLine: 'none',
          },
          list_item: {
            color: defaultColor,
            fontSize: theme.typography.size.lg,
            fontFamily: theme.typography.family.sans,
            lineHeight: 24,
            marginVertical: 2,
          },
          bullet_list: {
            marginVertical: 4,
          },
          ordered_list: {
            marginVertical: 4,
          },
        }}
      >
        {children}
      </Markdown>
    </View>
  );
});
