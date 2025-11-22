import { Box } from "@/primitives";
import { Text } from "@/primitives/text";
import { Icon } from "@/primitives/icon";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { Pressable, ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import type { StepProps } from "@/ui/sheet-navigator/types";
import {
  routeIconConfigs,
  type RouteIconName,
  NavigationButtons,
} from "@/molecules/route";

type RouteIcon = RouteIconName;

// Animated Linear Gradient component
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Individual animated icon component
const AnimatedRouteIcon = ({
  iconConfig,
  isSelected,
  onPress,
}: {
  iconConfig: any;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const targetRadius = isSelected ? 12 : 28;
    const targetScale = isSelected ? 1.1 : 0.9;

    return {
      borderRadius: withSpring(targetRadius, {
        damping: 20,
        stiffness: 200,
        overshootClamping: true,
      }),
      transform: [
        {
          scale: withSpring(targetScale, {
            damping: 15,
            stiffness: 180,
          }),
        },
      ],
    };
  }, [isSelected]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: withSpring(isSelected ? 0.25 : 0, {
        damping: 15,
        stiffness: 150,
      }),
      elevation: withSpring(isSelected ? 8 : 0, {
        damping: 15,
        stiffness: 150,
      }),
    };
  }, [isSelected]);

  return (
    <Animated.View
      style={[styles.iconOption, styles.iconShadow, containerStyle]}
    >
      <Pressable onPress={onPress} style={{ width: "100%", height: "100%" }}>
        <AnimatedLinearGradient
          colors={iconConfig.gradient}
          style={[styles.iconGradient, animatedStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon
            icon={Feather}
            name={iconConfig.name}
            size={24}
            color="#FFFFFF"
          />
        </AnimatedLinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export const RouteIconStep: React.FC<StepProps> = ({
  data,
  updateData,
  goNext,
  goBack,
  isLoading,
  errors,
  stepIndex,
}) => {
  const [selectedIcon, setSelectedIcon] = useState<RouteIcon>(
    data.icon || "package"
  );

  // Initialize default icon in parent data on first load
  useEffect(() => {
    if (!data.icon) {
      updateData({ icon: "package" });
    }
  }, []);

  const handleIconSelect = (icon: RouteIcon) => {
    setSelectedIcon(icon);
    updateData({ icon });
  };

  const canProceed = true; // Always can proceed since we have a default icon

  const handleNext = () => {
    updateData({ icon: selectedIcon || "package" });
    goNext();
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Box gap="lg" p="md">
        {/* Icon Selection Grid */}
        <Box gap="sm">
          <Text size="md" weight="semibold">
            Select Icon
          </Text>
          <Box style={styles.iconGrid}>
            {routeIconConfigs.map((iconConfig) => (
              <AnimatedRouteIcon
                key={iconConfig.id}
                iconConfig={iconConfig}
                isSelected={selectedIcon === iconConfig.name}
                onPress={() => handleIconSelect(iconConfig.name as RouteIcon)}
              />
            ))}
          </Box>
        </Box>

        {/* Preview with Selected Icon */}
        <Box gap="sm">
          <Text size="md" weight="semibold">
            Preview
          </Text>
          <Box style={styles.previewCard}>
            <Box direction="row" alignItems="center" gap="md">
              <LinearGradient
                colors={
                  routeIconConfigs.find((config) => config.name === selectedIcon)
                    ?.gradient || ["#6366F1", "#4F46E5"]
                }
                style={styles.previewIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon
                  icon={Feather}
                  name={selectedIcon}
                  size={24}
                  color="#FFFFFF"
                />
              </LinearGradient>
              <Box flex>
                <Text size="lg" weight="semibold">
                  {data.title || "Your Route Name"}
                </Text>
                {data.description && (
                  <Text size="sm" style={{ opacity: 0.7, marginTop: 2 }}>
                    {data.description}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Error Display */}
        {errors && Object.keys(errors).length > 0 && (
          <Box gap="xs">
            {Object.entries(errors).map(([key, error]) => (
              <Text key={key} size="sm" style={{ color: "#EF4444" }}>
                {error}
              </Text>
            ))}
          </Box>
        )}

        {/* Navigation Buttons */}
        <NavigationButtons
          canGoBack={stepIndex > 0}
          canGoNext={canProceed}
          isLoading={isLoading}
          nextText="Next"
          onBack={goBack}
          onNext={handleNext}
        />
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  routeInfoCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.lighter,
    borderWidth: 1,
    borderColor: theme.colors.background.lightest,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "flex-start",
    width: "100%",
    paddingVertical: theme.spacing.sm,
  },
  iconOption: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.xs, // Small horizontal margin for 5-per-row
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 8,
  },
  previewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.lighter,
    borderWidth: 1,
    borderColor: theme.colors.background.lightest,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
}));
