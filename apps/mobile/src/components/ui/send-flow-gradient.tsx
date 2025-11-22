import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useTokenGradient } from "@/services/api/local/tokens";
import { Box } from "./primitives";
import type { ViewStyle, StyleProp } from "react-native";

export interface SendFlowGradientProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  fallbackColor?: string;
  direction?: "vertical" | "horizontal" | "diagonal";
  positions?: "top" | "bottom" | "center" | "full";
  disabled?: boolean;
  mint?: string;
}

const SendFlowGradient: React.FC<SendFlowGradientProps> = ({
  children,
  style,
  opacity = 0.7,
  direction = "vertical",
  positions = "top",
  disabled = false,
  mint,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Get token data from route parameters or mint prop
  const { coin } = useLocalSearchParams();

  const targetMint = mint || (coin as string);

  // Use the database gradient colors directly
  const { data: gradientColors, isLoading } = useTokenGradient(
    targetMint || "",
    {
      enabled: !disabled && !!targetMint,
    }
  );

  // Reset animation whenever component mounts or targetMint changes
  useEffect(() => {
    if (!disabled && targetMint) {
      // Stop any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }
      fadeAnim.setValue(0);
    }
  }, [targetMint, disabled, fadeAnim]);

  // Animate in when gradient colors are available
  useEffect(() => {
    if (gradientColors && !isLoading && !disabled) {
      // Stop any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Small delay to ensure proper state reset
      const timer = setTimeout(() => {
        animationRef.current = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        });
        animationRef.current.start();
      }, 100);

      return () => {
        clearTimeout(timer);
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    }
  }, [gradientColors, isLoading, disabled, fadeAnim]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const gradientStartEnd = React.useMemo(() => {
    switch (direction) {
      case "horizontal":
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
      case "diagonal":
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
      case "vertical":
      default:
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
    }
  }, [direction]);

  const gradientColors2 = React.useMemo((): string[] => {
    if (!gradientColors) {
      // Use fallback colors when no gradient is available
      const fallbackPrimary = `rgba(99, 102, 241, ${opacity})`;
      const fallbackSecondary = `rgba(99, 102, 241, ${opacity * 0.5})`;

      switch (positions) {
        case "top":
          return [
            fallbackPrimary,
            fallbackSecondary,
            "transparent",
            "transparent",
          ];
        case "bottom":
          return [
            "transparent",
            "transparent",
            fallbackSecondary,
            fallbackPrimary,
          ];
        case "center":
          return [
            "transparent",
            fallbackPrimary,
            fallbackSecondary,
            "transparent",
          ];
        case "full":
        default:
          return [fallbackPrimary, fallbackSecondary];
      }
    }

    switch (positions) {
      case "top":
        return [
          gradientColors.primary, // Strong at top (0%)
          gradientColors.secondary || gradientColors.primary, // Medium at 30%
          gradientColors.accent || "rgba(0,0,0,0.05)", // Subtle at 60%
          "transparent", // Fully transparent at bottom (100%)
        ];
      case "bottom":
        return [
          "transparent",
          "transparent",
          gradientColors.secondary || gradientColors.primary,
          gradientColors.primary,
        ];
      case "center":
        return [
          "transparent",
          gradientColors.primary,
          gradientColors.secondary || gradientColors.primary,
          "transparent",
        ];
      case "full":
      default:
        return [
          gradientColors.primary,
          gradientColors.secondary || gradientColors.primary,
        ];
    }
  }, [gradientColors, positions, opacity]);

  // If disabled, just render children without gradient
  if (disabled) {
    return <Box style={style}>{children}</Box>;
  }

  // Show children while loading
  if (isLoading) {
    return <Box style={style}>{children}</Box>;
  }

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, style, { opacity: fadeAnim }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={
            gradientColors2.length >= 2
              ? (gradientColors2 as [string, string, ...string[]])
              : ([
                  gradientColors2[0] || "transparent",
                  gradientColors2[0] || "transparent",
                ] as [string, string])
          }
          locations={
            positions === "top"
              ? [0, 0.25, 0.6, 1.0] // Top-heavy distribution
              : undefined
          }
          {...gradientStartEnd}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      {children}
    </>
  );
};

export default SendFlowGradient;
