import {
  BlurView as ExpoBlurView,
  type BlurTint,
  type ExperimentalBlurMethod,
} from "expo-blur";
import { withUnistyles } from "react-native-unistyles";

const BlurView = withUnistyles(ExpoBlurView, (_theme, rt) => ({
  tint: (rt.themeName === "dark" ? "dark" : "light") as BlurTint,
  experimentalBlurMethod: "dimezisBlurView" as ExperimentalBlurMethod,
}));

export default BlurView;
