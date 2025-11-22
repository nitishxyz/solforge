import { useState, useRef, useEffect } from "react";
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Ionicons } from "@expo/vector-icons";

interface MessageComposerProps {
  onSubmit: (message: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSubmit,
  disabled,
  placeholder = "Type a message...",
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { theme } = useUnistyles();

  async function handleSubmit() {
    if (!value.trim() || isSubmitting) {
      return;
    }

    const messageToSend = value.trim();
    setValue("");
    setIsSubmitting(true);
    try {
      await onSubmit(messageToSend);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }

  const hasValue = value.trim().length > 0;
  const canSubmit = hasValue && !disabled;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.container}>
        <View style={styles.wrapper}>
          <View style={[
            styles.inputContainer, 
            hasValue && styles.inputContainerActive
          ]}>
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.text.subtle}
              editable={true}
              multiline
              style={[
                styles.input, 
              ]}
            />
            <View style={styles.buttonContainer}>
              <Pressable
                onPress={handleSubmit}
                disabled={disabled || !canSubmit || isSubmitting}
                style={({ pressed }) => [
                  styles.button,
                  (canSubmit || isSubmitting) && !disabled ? styles.buttonActive : styles.buttonInactive,
                  pressed && canSubmit && !isSubmitting && styles.buttonPressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={
                      canSubmit
                        ? theme.colors.text.inverse
                        : theme.colors.text.subtle
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  wrapper: {
    maxWidth: 768,
    alignSelf: "center",
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.mega,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
    backgroundColor: theme.colors.background.subtle,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    minHeight: 52,
  },
  inputContainerActive: {
    borderColor: theme.colors.primary[500],
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.family.mono,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.default,
    maxHeight: 120,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  buttonContainer: {
    alignSelf: "stretch",
    justifyContent: "flex-end",
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  buttonInactive: {
    backgroundColor: theme.colors.background.muted,
  },
  buttonPressed: {
    opacity: 0.8,
  },
}));
