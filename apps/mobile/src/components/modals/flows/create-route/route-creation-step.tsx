import { Box, ProgressBar } from "@/primitives";
import { Text } from "@/primitives/text";
import { Icon } from "@/primitives/icon";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import { ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";
import type { StepProps } from "@/ui/sheet-navigator/types";
import { NavigationButtons } from "@/components/molecules/route/navigation-buttons";
import { useCreateRoute } from "@/services/api/remote/create-route";
import { RouteDatabaseService } from "@/services/api/database/routes";
import { router } from "expo-router";

type CreationState = "creating" | "success" | "error";

export const RouteCreationStep: React.FC<StepProps> = ({
  data,
  goNext,
  goBack,
  dismiss,
  setStepComplete,
}) => {
  const [creationState, setCreationState] = useState<CreationState>("creating");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdRouteId, setCreatedRouteId] = useState<string | null>(null);

  // Smooth animations for icon
  const iconScale = useSharedValue(0);

  // Simplified route creation (Grid-only, no blockchain)
  const createRouteMutation = useCreateRoute();

  // Simplified creation steps
  const creationSteps = [
    "Validating route information...",
    "Creating route...",
    "Syncing to device...",
    "Finalizing setup...",
  ];

  // Start route creation process
  useEffect(() => {
    if (creationState === "creating") {
      handleRouteCreation();
    }
  }, [creationState]);

  const handleRouteCreation = useCallback(async () => {
    try {
      // Extract route data from the flow
      const { title, description, icon, routeId } = data;

      if (!title) {
        throw new Error("Route title is required");
      }

      // Step 1: Validating
      setCurrentStep(creationSteps[0]);
      setProgress(25);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Step 2: Creating route (direct API call, no blockchain)
      setCurrentStep(creationSteps[1]);
      setProgress(50);

      const result = await createRouteMutation.mutateAsync({
        slug: routeId, // Use routeId as slug
        title,
        description: description || undefined,
        icon: icon || undefined,
        isActive: true,
        isDefault: false,
      });

      console.log("✅ Route created on server:", result.route.id);

      // Step 3: Syncing to device (ensure it's in local DB)
      setCurrentStep(creationSteps[2]);
      setProgress(75);

      // Double-check that the route is cached locally before navigating
      let localRoute = await RouteDatabaseService.getRouteById(result.route.id);
      let retries = 0;
      while (!localRoute && retries < 3) {
        console.log(`⏳ Waiting for route to sync locally (attempt ${retries + 1}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        localRoute = await RouteDatabaseService.getRouteById(result.route.id);
        retries++;
      }

      if (!localRoute) {
        console.warn("⚠️ Route not found in local DB, forcing sync...");
        await RouteDatabaseService.syncRemoteRoutesToLocal([result.route]);
        localRoute = await RouteDatabaseService.getRouteById(result.route.id);
      }

      if (!localRoute) {
        throw new Error("Failed to sync route to local database");
      }

      console.log("✅ Route confirmed in local database");

      // Step 4: Finalizing
      setCurrentStep(creationSteps[3]);
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Success!
      setCreationState("success");
      setCreatedRouteId(result.route.id);
      animateIcon();
      setStepComplete?.(true);

      console.log("🎉 Route creation complete!");
    } catch (error) {
      setCreationState("error");

      // Provide better error messages based on error type
      let userFriendlyMessage = "An unexpected error occurred";

      if (error instanceof Error) {
        if (error.message.includes("already in use") || error.message.includes("already taken")) {
          userFriendlyMessage =
            "This route slug is already taken. Please choose a different one.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("connection")
        ) {
          userFriendlyMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("sync") || error.message.includes("local database")) {
          userFriendlyMessage =
            "Route created but failed to sync locally. Please refresh your routes list.";
        } else {
          userFriendlyMessage = error.message;
        }
      }

      setErrorMessage(userFriendlyMessage);
      animateIcon();
      console.error("❌ Route creation failed:", error);
    }
  }, [data, createRouteMutation, setStepComplete, creationSteps]);

  const animateIcon = () => {
    iconScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });
  };

  const handleRetry = () => {
    setCreationState("creating");
    setProgress(0);
    setCurrentStep("");
    setErrorMessage("");
    iconScale.value = 0;
    setStepComplete?.(false);
    createRouteMutation.reset();
  };

  const handleDone = () => {
    if (createdRouteId) {
      console.log("📍 Navigating to route:", createdRouteId);
      // First dismiss the modal, then navigate to the route details page
      dismiss?.();
      
      // Small delay to ensure modal dismisses before navigation
      setTimeout(() => {
        router.push(`/(app)/route/${createdRouteId}`);
      }, 100);
    } else {
      // Fallback to next step
      goNext();
    }
  };

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const renderContent = () => {
    // Show loading state during creation and progress
    if (creationState === "creating") {
      return (
        <Box center gap="lg">
          {/* Icon container with proper size */}
          <Box style={styles.iconContainer} center>
            <ActivityIndicator
              size="large"
              color="#6366F1"
            />
          </Box>

          {/* Status text */}
          <Text size="lg" weight="medium" style={{ textAlign: "center" }}>
             {currentStep || "Creating your route..."}
          </Text>

          {/* Animated progress bar */}
          <Box style={{ width: "100%", marginTop: 16 }}>
            <ProgressBar
              progress={progress}
              size="lg"
              mode="brand"
              duration={400}
            />
          </Box>

          {/* Show additional feedback if mutation is pending */}
          {createRouteMutation.isPending && progress > 50 && (
            <Text size="sm" style={{ opacity: 0.6, textAlign: "center" }}>
              Almost done...
            </Text>
          )}
        </Box>
      );
    }

    // Success state
    if (creationState === "success") {
      return (
        <Box center gap="lg">
          <Animated.View style={iconAnimatedStyle}>
            <Box style={styles.successContainer}>
              <Icon icon={Feather} name="check" size={28} color="#FFFFFF" />
            </Box>
          </Animated.View>

          <Text
            size="lg"
            weight="medium"
            style={{ textAlign: "center", color: "#10B981" }}
          >
             Route created successfully
          </Text>

          <NavigationButtons
            canGoBack={false}
             nextText="Go to Route"
            onNext={handleDone}
          />
        </Box>
      );
    }

    // Error state
    if (creationState === "error") {
      return (
        <Box center gap="lg">
          <Animated.View style={iconAnimatedStyle}>
            <Box style={styles.errorContainer}>
              <Icon icon={Feather} name="x" size={28} color="#FFFFFF" />
            </Box>
          </Animated.View>

          <Box center gap="sm">
            <Text
              size="lg"
              weight="medium"
              style={{ textAlign: "center", color: "#EF4444" }}
            >
              Creation failed
            </Text>
            <Text size="sm" style={{ opacity: 0.6, textAlign: "center" }}>
              {errorMessage}
            </Text>
          </Box>

          <NavigationButtons
            canGoBack={true}
            nextText="Try Again"
            onBack={goBack}
            onNext={handleRetry}
          />
        </Box>
      );
    }

    return null;
  };

  return (
    <Box style={styles.container}>
      <Box p="lg" style={styles.content}>
        {renderContent()}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    minHeight: 250,
    justifyContent: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background.lighter,
  },
  successContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
}));
