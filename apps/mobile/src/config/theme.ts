import { generateColorTheme } from "@/utils/colors";
import { layout, radius, sizing, spacing, typography } from "./sizing";

const theme = generateColorTheme({
  base: {
    light: {
      primary: "#0d0f12",
      brand: "#4285f4",
      secondary: "#007AFF",
      success: "#16A34A",
      warning: "#FF9500",
      error: "#FF3B30",
      neutral: "#6B7280",
      contrast: "#000000",
      disabled: "#D1D1D6",
      // Chat User (Emerald-ish)
      chatUserBg: "#ecfdf5", // emerald-50
      chatUserBorder: "#a7f3d0", // emerald-200
      chatUserText: "#047857", // emerald-700
      // Chat Assistant (Violet-ish)
      chatAssistantBg: "#f5f3ff", // violet-50
      chatAssistantBorder: "#ddd6fe", // violet-200
      chatAssistantText: "#6d28d9", // violet-700
      chatAssistantPrimary: "#8b5cf6", // violet-500
    },
    dark: {
      primary: "#f1f3f7",
      brand: "#4285f4",
      secondary: "#0A84FF",
      success: "#16A34A",
      warning: "#FF9F0A",
      error: "#FF453A",
      neutral: "#98989D",
      contrast: "#FFFFFF",
      disabled: "#D1D1D6",
      // Chat User (Emerald-ish with transparency)
      chatUserBg: "rgba(16, 185, 129, 0.1)", // emerald-500/10
      chatUserBorder: "rgba(16, 185, 129, 0.2)", // emerald-500/20
      chatUserText: "#6ee7b7", // emerald-300
      // Chat Assistant (Violet-ish with transparency)
      chatAssistantBg: "rgba(139, 92, 246, 0.1)", // violet-500/10
      chatAssistantBorder: "rgba(139, 92, 246, 0.2)", // violet-500/20
      chatAssistantText: "#c4b5fd", // violet-300
      chatAssistantPrimary: "#8b5cf6", // violet-500
    },
  },
  text: {
    light: {
      default: "#202329",
    },
    dark: {
      default: "#fafafa",
    },
  },
  surfaces: {
    light: {
      background: "#FFFFFC",
      border: "#6B7280",
    },
    dark: {
      background: "#0d0f12",
      border: "#98989D",
    },
  },
});

export const lightTheme = {
  ...theme.light,
  sizing,
  spacing,
  radius,
  typography,
  layout,
};

export const darkTheme = {
  ...theme.dark,
  sizing,
  spacing,
  radius,
  typography,
  layout,
};
