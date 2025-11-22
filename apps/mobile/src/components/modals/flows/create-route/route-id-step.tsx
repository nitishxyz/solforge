import { Box } from "@/primitives";
import { Text } from "@/primitives/text";
import { Icon } from "@/primitives/icon";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { ScrollView, Keyboard, ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { StepProps } from "@/ui/sheet-navigator/types";
import { NavigationButtons } from "@/molecules/route";
import { BottomSheetInput } from "@/primitives/bottom-sheet-input";
import { checkRouteAvailability } from "@/services/api/remote";

export const RouteIdStep: React.FC<StepProps> = ({
  data,
  updateData,
  goNext,
  goBack,
  isLoading,
  errors,
  stepIndex,
}) => {
  const [routeId, setRouteId] = useState(data.routeId || "");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  // Real availability check using API
  const checkAvailability = async (id: string) => {
    if (!id || id.length < 3) {
      setIsAvailable(null);
      setAvailabilityError(null);
      return;
    }

    setIsChecking(true);
    setAvailabilityError(null);

    try {
      const result = await checkRouteAvailability(id);
      setIsAvailable(result.available);

      if (!result.available && result.error) {
        setAvailabilityError(result.error);
      }
    } catch (error) {
      console.error("Failed to check route availability:", error);
      setIsAvailable(null);
      setAvailabilityError("Failed to check availability. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // Debounced availability check
  useEffect(() => {
    if (!routeId || routeId.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkAvailability(routeId);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [routeId]);

  const handleRouteIdChange = (value: string) => {
    // Only allow lowercase letters, numbers, and underscores
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .substring(0, 20);

    setRouteId(sanitized);
    updateData({ routeId: sanitized });
    setIsAvailable(null);
    setAvailabilityError(null);
  };

  const canProceed = routeId.length >= 3 && isAvailable === true && !isChecking;

  const handleNext = () => {
    if (canProceed) {
      // Dismiss keyboard before navigation to prevent BottomSheetModal conflicts
      Keyboard.dismiss();
      
      // Small delay to ensure keyboard dismissal completes before navigation
      setTimeout(() => {
        updateData({ routeId: routeId.trim() });
        goNext();
      }, 150);
    }
  };

  const getRightAccessory = () => {
    if (isChecking) {
      return (
        <BottomSheetInput.Accessory>
          <ActivityIndicator size="small" color="#6B7280" />
        </BottomSheetInput.Accessory>
      );
    }
    if (isAvailable === true) {
      return (
        <BottomSheetInput.Accessory>
          <Icon icon={Feather} name="check-circle" size={16} color="#10B981" />
        </BottomSheetInput.Accessory>
      );
    }
    if (isAvailable === false) {
      return (
        <BottomSheetInput.Accessory>
          <Icon icon={Feather} name="x-circle" size={16} color="#EF4444" />
        </BottomSheetInput.Accessory>
      );
    }
    return undefined;
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps
      bounces={false}
    >
      <Box gap="lg" p="md">
        {/* Route ID Input */}
        <Box gap="sm">
          <BottomSheetInput
            placeholder="route-id"
            value={routeId}
            onChangeText={handleRouteIdChange}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            mode={
              isAvailable === true
                ? "success"
                : isAvailable === false
                ? "error"
                : undefined
            }
            rightAccessory={getRightAccessory()}
          />

          <Box
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text size="xs" style={{ opacity: 0.5 }}>
               soljar.xyz/{routeId || "route-id"}
            </Text>
            <Text size="xs" style={{ opacity: 0.5 }}>
              {routeId.length}/20
            </Text>
          </Box>

          {/* Show error message if there's a specific error */}
          {isAvailable === false && availabilityError && (
            <Text size="sm" style={{ color: "#EF4444", marginTop: 4 }}>
              {availabilityError}
            </Text>
          )}
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
          nextText="Create"
          onBack={goBack}
          onNext={handleNext}
        />
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create(() => ({
  container: {
    flex: 1,
  },
}));
