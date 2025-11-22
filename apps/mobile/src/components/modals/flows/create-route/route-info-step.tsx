import { Box } from "@/primitives";
import { Text } from "@/primitives/text";
import { useState } from "react";
import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { StepProps } from "@/ui/sheet-navigator/types";
import { NavigationButtons } from "@/molecules/route";
import { BottomSheetInput } from "@/src/components/ui/primitives/bottom-sheet-input";
import BottomSheetTextArea from "@/src/components/ui/primitives/bottom-sheet-text-area";

export const RouteInfoStep: React.FC<StepProps> = ({
  data,
  updateData,
  goNext,
  goBack,
  isLoading,
  errors,
  stepIndex,
}) => {
  const [title, setTitle] = useState(data.title || "");
  const [description, setDescription] = useState(data.description || "");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updateData({ title: value });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    updateData({ description: value });
  };

  const canProceed = title.trim().length >= 2;

  const handleNext = () => {
    if (canProceed) {
      updateData({
        title: title.trim(),
        description: description.trim(),
      });
      goNext();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps
      bounces={false}
    >
      <Box gap="md" p="md">
        {/* Title Input */}
        <Box gap="sm">
          <Text size="md" weight="semibold">
            Route Name *
          </Text>
          <BottomSheetInput
            placeholder="e.g., Emergency Fund, Vacation, New Laptop"
            value={title}
            onChangeText={handleTitleChange}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Box
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text size="xs" style={{ opacity: 0.6 }}>
              Minimum 2 characters
            </Text>
            <Text size="xs" style={{ opacity: 0.6 }}>
              {title.length}/50
            </Text>
          </Box>
        </Box>

        {/* Description Input */}
        <Box gap="sm">
          <Text size="md" weight="semibold">
            Description
          </Text>
          <BottomSheetTextArea
            placeholder="Optional description."
            value={description}
            onChangeText={handleDescriptionChange}
            maxLength={20}
            autoCapitalize="sentences"
          />
          <Box direction="row" justifyContent="flex-end">
            <Text size="xs" style={{ opacity: 0.6 }}>
              {description.length}/200
            </Text>
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
  previewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.lighter,
    borderWidth: 1,
    borderColor: theme.colors.background.lightest,
  },
}));
