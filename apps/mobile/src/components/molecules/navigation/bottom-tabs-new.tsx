import haptics from "@/components/utils/haptics";
import { Box, Button, Icon } from "@/primitives";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import { Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Color from "color";
import { useUnistyles, StyleSheet } from "react-native-unistyles";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import ActionModal from "../../modals/action-modal";
import { AIChatModal } from "../../modals/ai-chat-modal";
import GorhomSheetNavigator, {
  type GorhomSheetNavigatorRef,
} from "../../ui/sheet-navigator/gorhom-sheet-navigator";
import {
  RouteInfoStep,
  RouteIconStep,
  RouteIdStep,
  RouteCreationStep,
} from "../../modals/flows/create-route";

const routes = [
  {
    name: "home",
    icon: MaterialCommunityIcons,
    iconName: "circle-multiple-outline",
    iconNameFocused: "circle-multiple",
    label: "Home",
    path: "(app)/tabs/home",
    size: 25,
  },
  {
    name: "stocks",
    icon: Ionicons,
    iconName: "bar-chart-outline",
    iconNameFocused: "bar-chart",
    label: "Stocks",
    path: "(app)/tabs/stocks",
    size: 21,
  },
  {
    name: "settings",
    icon: Ionicons,
    iconName: "settings-outline",
    iconNameFocused: "settings",
    label: "Settings",
    path: "(app)/tabs/settings",
    size: 23,
  },
];

const TabItem = React.memo(
  ({
    route,
    isFocused,
    onPress,
  }: {
    route: (typeof routes)[0];
    isFocused: boolean;
    onPress: () => void;
  }) => {
    const animatedValue = useSharedValue(isFocused ? 1 : 0);

    // Update animation when focus changes
    React.useEffect(() => {
      animatedValue.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused, animatedValue]);

    // Animated style for the icon container
    const iconStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            rotate: `${interpolate(
              animatedValue.value,
              [0, 1],
              [0, 360],
              Extrapolation.CLAMP,
            )}deg`,
          },
          {
            scale: interpolate(
              animatedValue.value,
              [0, 1],
              [1, 1.1],
              Extrapolation.CLAMP,
            ),
          },
        ],
      };
    });

    const handlePress = React.useCallback(() => {
      haptics.selection();
      onPress();
    }, [onPress]);

    return (
      <Pressable onPress={handlePress} style={styles.tab}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Icon
            icon={route.icon}
            name={isFocused ? route.iconNameFocused : route.iconName}
            size={route.size}
          />
        </Animated.View>
      </Pressable>
    );
  },
);
TabItem.displayName = "TabItem";

const BottomTabs = React.memo(({ ...props }: BottomTabBarProps) => {
  const { state } = props;
  const { index } = state;
  const thumbPosition = useSharedValue(index);
  const { theme } = useUnistyles();

  // ActionModal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const createRouteSheetRef = useRef<GorhomSheetNavigatorRef>(null);

  // Update thumb position when active tab changes
  React.useEffect(() => {
    thumbPosition.value = withTiming(index, { duration: 200 });
  }, [index, thumbPosition]);

  // Animated style for the thumb indicator
  const thumbStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / routes.length;
    const thumbWidth = tabWidth * 0.3;
    const leftPosition = interpolate(
      thumbPosition.value,
      [0, routes.length - 1],
      [
        (tabWidth - thumbWidth) / 2,
        tabWidth * (routes.length - 1) + (tabWidth - thumbWidth) / 2,
      ],
      Extrapolation.CLAMP,
    );

    return {
      left: `${leftPosition}%`,
      width: `${thumbWidth}%`,
    };
  });

  const navigateToRoute = React.useCallback((path: string) => {
    router.navigate(path as any);
  }, []);

  const handleSparklesPress = React.useCallback(() => {
    haptics.selection();
    setShowAIChatModal(true);
  }, []);

  const handlePlusPress = React.useCallback(() => {
    haptics.selection();
    setShowActionModal(true);
  }, []);

  const handleCreateRoute = React.useCallback(() => {
    setShowActionModal(false);
    // Longer delay to let ActionModal close completely and prevent conflicts
    setTimeout(() => {
      createRouteSheetRef.current?.present();
    }, 500);
  }, []);

  const handleCompleteRouteCreation = async (data: any) => {
    console.log("Route creation completed with data:", data);
    // This is where we'll integrate the actual route creation API
    // For now, just simulate async completion
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Sheet will auto-close after completion
  };

  const handleCloseRouteSheet = () => {
    // Called when sheet is dismissed
    console.log("Route creation sheet closed");
  };

  // Route creation steps - 4 step flow
  const routeCreationSteps = [
    {
      id: "route-info",
      title: "Route Details",
      component: RouteInfoStep,
      validation: (data: any) => {
        if (!data.title || data.title.trim().length < 2) {
          return "Please enter a route name (minimum 2 characters)";
        }
        return true;
      },
    },
    {
      id: "route-icon",
      title: "Choose Icon",
      component: RouteIconStep,
      validation: (data: any) => {
        if (!data.icon) {
          return "Please select an icon";
        }
        return true;
      },
    },
    {
      id: "route-id",
      title: "Route ID",
      component: RouteIdStep,
      validation: (data: any) => {
        if (!data.routeId || data.routeId.length < 3) {
          return "Please enter a route ID (minimum 3 characters)";
        }
        if (!/^[a-z0-9-]+$/.test(data.routeId)) {
          return "Route ID can only contain lowercase letters, numbers, and hyphens";
        }
        return true;
      },
    },
    {
      id: "route-creation",
      title: "Creating Route",
      component: RouteCreationStep,
      canGoBack: false, // Don't allow going back during creation
    },
  ];

  return (
    <Box style={styles.bottomContainer}>
      <LinearGradient
        pointerEvents="none"
        colors={(() => {
          const base = theme.colors.background.plain;
          try {
            const c = (a: number) => Color(base).alpha(a).rgb().string();
            return [c(0.6), c(0.3), c(0.1), "transparent"];
          } catch (_e) {
            return [
              "rgba(0,0,0,0.6)",
              "rgba(0,0,0,0.3)",
              "rgba(0,0,0,0.1)",
              "rgba(0,0,0,0.05)",
              "rgba(0,0,0,0.025)",
              "transparent",
            ];
          }
        })()}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.gradient}
      />
      <Button
        variant="ghost"
        size="auto"
        haptics="none"
        shadow="sm"
        rounded="full"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={handleSparklesPress}
      >
        <Box style={styles.compactBtn} background="plain">
          <Button.Icon>
            {(props) => (
              <Icon
                icon={Ionicons}
                name="sparkles-outline"
                {...props}
                size={24}
              />
            )}
          </Button.Icon>
        </Box>
      </Button>

      <Box style={[styles.container]} background="plain" shadow="sm">
        <Animated.View style={[styles.thumb, thumbStyle]} />
        {routes.map((route, idx) => (
          <TabItem
            key={route.name}
            route={route}
            isFocused={index === idx}
            onPress={() => navigateToRoute(route.path)}
          />
        ))}
      </Box>
      <Button
        variant="ghost"
        size="auto"
        shadow="sm"
        rounded="full"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={handlePlusPress}
      >
        <Box style={styles.compactBtn} background="plain">
          <Button.Icon>
            {(props) => (
              <Icon icon={Feather} name="plus" {...props} size={24} />
            )}
          </Button.Icon>
        </Box>
      </Button>

      <ActionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        onCreateRoute={handleCreateRoute}
      />

      <AIChatModal
        visible={showAIChatModal}
        onClose={() => setShowAIChatModal(false)}
      />

      <GorhomSheetNavigator
        ref={createRouteSheetRef}
        visible={false} // Not used - controlled via ref
        onClose={handleCloseRouteSheet}
        steps={routeCreationSteps}
        onComplete={handleCompleteRouteCreation}
        title="Create New Route"
        showProgress={true}
      />
    </Box>
  );
});
BottomTabs.displayName = "BottomTabs";

export default BottomTabs;

const styles = StyleSheet.create((theme, rt) => ({
  bottomContainer: {
    paddingBottom: rt.insets.bottom,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 82 + rt.insets.bottom,
    zIndex: 0,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    zIndex: 1000,
    marginLeft: 15,
    marginRight: 15,
  },
  compactBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    overflow: "hidden",
    padding: theme.sizing.md,
  },
  tab: {
    width: 60,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    backfaceVisibility: "hidden",
  },
  thumb: {
    position: "absolute",
    height: 4,
    top: 0,
    borderRadius: 2,
    zIndex: 0,
    backgroundColor: theme.colors.text.default,
  },
}));
