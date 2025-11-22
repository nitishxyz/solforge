import { StyleSheet } from "react-native-unistyles";
import { Box, type BoxProps } from "./primitives";
import { ModalHeader } from "./headers/modal-header";
import SendFlowGradient from "./send-flow-gradient";
import ImageGradient from "./image-gradient";
// import ImageGradient from "./image-gradient";
// import SendFlowGradient from "./send-flow-gradient";

const InSheetView = ({
  children,
  title,
  enableGradient = true,
  mint,
  backEnabled,
  ...boxProps
}: {
  children: React.ReactNode;
  title: string;
  enableGradient?: boolean;
  mint?: string;
  backEnabled?: boolean;
} & BoxProps) => {
  return (
    <Box flex safeAreaBottom {...boxProps}>
      {enableGradient && mint && <ImageGradient mint={mint} />}
      {enableGradient && <SendFlowGradient />}
      <ModalHeader title={title} backEnabled={backEnabled} />
      <Box style={styles.container}>{children}</Box>
    </Box>
  );
};

export default InSheetView;

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    height: rt.screen.height - rt.insets.top - rt.insets.bottom - 80,
  },
}));
