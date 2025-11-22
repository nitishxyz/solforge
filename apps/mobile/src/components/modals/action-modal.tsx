import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import Modal from "../ui/modal";
import { Box, Button, Icon } from "../ui/primitives";

type ActionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreateRoute?: () => void;
  onCreateInvoice?: () => void;
};

// Spring configuration
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

const ActionModal = ({
  visible,
  onClose,
  onCreateRoute,
  onCreateInvoice,
}: ActionModalProps) => {
  // Animation values for each button
  const closeButtonScale = useSharedValue(0);
  const closeButtonOpacity = useSharedValue(0);
  const routeButtonScale = useSharedValue(0);
  const routeButtonOpacity = useSharedValue(0);
  const invoiceButtonScale = useSharedValue(0);
  const invoiceButtonOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset all values to 0 when modal opens
      closeButtonScale.value = 0;
      closeButtonOpacity.value = 0;
      routeButtonScale.value = 0;
      routeButtonOpacity.value = 0;
      invoiceButtonScale.value = 0;
      invoiceButtonOpacity.value = 0;

      // Animate buttons in with staggered delays
      closeButtonScale.value = withSpring(1, springConfig);
      closeButtonOpacity.value = withSpring(1, springConfig);

      routeButtonScale.value = withDelay(100, withSpring(1, springConfig));
      routeButtonOpacity.value = withDelay(100, withSpring(1, springConfig));

      invoiceButtonScale.value = withDelay(200, withSpring(1, springConfig));
      invoiceButtonOpacity.value = withDelay(200, withSpring(1, springConfig));
    } else {
      // Quick fade out when modal closes
      closeButtonScale.value = withSpring(0, { damping: 20, stiffness: 300 });
      closeButtonOpacity.value = withSpring(0, { damping: 20, stiffness: 300 });
      routeButtonScale.value = withSpring(0, { damping: 20, stiffness: 300 });
      routeButtonOpacity.value = withSpring(0, { damping: 20, stiffness: 300 });
      invoiceButtonScale.value = withSpring(0, { damping: 20, stiffness: 300 });
      invoiceButtonOpacity.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [
    visible,
    closeButtonOpacity,
    routeButtonOpacity,
    invoiceButtonOpacity,
    routeButtonScale,
    invoiceButtonScale,
    closeButtonScale,
  ]);

  // Animated styles for each button
  const closeButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: closeButtonScale.value }],
      opacity: closeButtonOpacity.value,
    };
  });

  const routeButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: routeButtonScale.value }],
      opacity: routeButtonOpacity.value,
    };
  });

  const invoiceButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: invoiceButtonScale.value }],
      opacity: invoiceButtonOpacity.value,
    };
  });

  const handleCreateRoute = () => {
    onCreateRoute?.();
  };

  const handleCreateInvoice = () => {
    onCreateInvoice?.();
  };

  return (
    <Modal visible={visible} onClose={onClose} animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.container}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Box style={styles.content}>
              <Animated.View style={invoiceButtonAnimatedStyle}>
                <Button
                  variant="ghost"
                  size="lg"
                  style={styles.actionButton}
                  onPress={handleCreateInvoice}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Button.Icon>
                    {(props) => (
                      <Icon icon={Feather} name="file-text" {...props} />
                    )}
                  </Button.Icon>
                  <Button.Text size="xxl">Create Invoice</Button.Text>
                </Button>
              </Animated.View>

              <Animated.View style={routeButtonAnimatedStyle}>
                <Button
                  variant="ghost"
                  size="lg"
                  style={styles.actionButton}
                  onPress={handleCreateRoute}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Button.Icon>
                    {(props) => (
                      <Icon icon={Feather} name="archive" {...props} />
                    )}
                  </Button.Icon>
                  <Button.Text size="xxl">Create Route</Button.Text>
                </Button>
              </Animated.View>

              <Animated.View style={closeButtonAnimatedStyle}>
                <Button
                  variant="ghost"
                  size="lg"
                  style={styles.actionButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Button.Icon>
                    {(props) => <Icon icon={Feather} name="x" {...props} />}
                  </Button.Icon>
                  <Button.Text size="xxl">Close</Button.Text>
                </Button>
              </Animated.View>
            </Box>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default ActionModal;

const styles = StyleSheet.create((theme, rt) => ({
  backdrop: {
    flex: 1,
  },
  container: {
    position: "absolute",
    bottom: rt.insets.bottom, // Position above bottom tabs
    right: theme.spacing.md,
  },
  content: {
    gap: theme.spacing.xs,
  },
  actionButton: {
    justifyContent: "flex-end",
  },
}));
