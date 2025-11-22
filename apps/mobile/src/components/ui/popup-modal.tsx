import { StyleSheet } from "react-native-unistyles";
import { Box, Button, Icon } from "@/primitives";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { Pressable, Platform, Keyboard } from "react-native";
import { H2 } from "./typography";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

type PopupModalProps = {
  children?: React.ReactNode;
  title?: string;
  onClose?: () => void;
  disableBackdrop?: boolean;
  disableCloseButton?: boolean;
};

const CloseButton = ({
  onPress,
  disabled,
  hidden,
}: {
  onPress?: () => void;
  disabled?: boolean;
  hidden?: boolean;
}) => {
  return (
    <Box
      style={[
        styles.closeButtonContainer,
        {
          opacity: hidden ? 0 : 1,
        },
      ]}
    >
      <Button
        style={styles.closeButton}
        rounded="full"
        size="auto"
        mode="subtle"
        onPress={onPress}
        hitSlop={10}
      >
        <Button.Icon>
          {(props) => <Icon {...props} icon={Feather} name={"x"} size={22} />}
        </Button.Icon>
      </Button>
    </Box>
  );
};

const PopupModal = ({
  children,
  title,
  onClose,
  disableBackdrop,
  disableCloseButton,
}: PopupModalProps) => {
  const translateY = useSharedValue(1000);
  const scale = useSharedValue(0.98);
  const backdropOpacity = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Subtle entrance animation
    backdropOpacity.value = withTiming(1, {
      duration: 200,
    });

    translateY.value = withSpring(0, {
      damping: 30,
      stiffness: 400,
      mass: 1,
    });

    scale.value = withSpring(1, {
      damping: 35,
      stiffness: 500,
      mass: 1,
    });
  }, []);
  const handleClose = () => {
    // Perfectly synchronized exit animation - same duration for both
    const exitDuration = 300;

    backdropOpacity.value = withTiming(0, {
      duration: exitDuration,
    });

    scale.value = withTiming(0.98, {
      duration: 200,
    });

    translateY.value = withTiming(
      1000,
      {
        duration: exitDuration,
      },
      (finished) => {
        if (finished && onClose) {
          runOnJS(onClose)();
        }
      }
    );
  };
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    marginBottom: withTiming(keyboardHeight, {
      duration: 250,
    }),
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <>
      {!disableBackdrop && (
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
          />
        </Animated.View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <Animated.View style={[animatedStyle, styles.sheetContainer]}>
          <Box m="md" p="md" shadow="md" style={styles.container}>
            <Box direction="row">
              {!disableCloseButton && (
                <CloseButton
                  onPress={handleClose}
                  disabled={true}
                  hidden={true}
                />
              )}
              <Box center flex>
                <H2>{title}</H2>
              </Box>
              <CloseButton
                onPress={handleClose}
                disabled={disableCloseButton}
                hidden={disableCloseButton}
              />
            </Box>

            <Box gap="sm" mt="md">
              {children}
            </Box>
          </Box>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
};

export default PopupModal;

const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.background.dim,
    borderRadius: theme.radius.giga,
    paddingTop: theme.spacing.lg,
  },
  closeButtonContainer: {
    zIndex: 1000,
  },
  closeButton: {
    height: 35,
    width: 35,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboardAvoidingView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
}));
