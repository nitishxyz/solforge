const env = process.env.EXPO_PUBLIC_ENV;
const bundleIdentifier = env
  ? `sh.solforge.chat.${env}`
  : `sh.solforge.chat`;
const scheme = env ? `solforgechat${env}` : `solforgechat`;

const name = env ? `Solforge Chat (${env.toUpperCase()})` : "Solforge Chat";

const config = {
  expo: {
    name: name,
    slug: "solforge-chat",
    version: "1.0.0",
    orientation: "portrait",
    updates: {
      url: "https://u.expo.dev/84e64d78-ead4-4ff7-b347-e68ae9a1a9b2",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    icon: "./assets/images/icon.png",
    scheme: scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      package: bundleIdentifier,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],

      [
        "expo-secure-store",
        {
          configureAndroidBackup: true,
          faceIDPermission:
            "Allow $(PRODUCT_NAME) to access your Face ID biometric data.",
        },
      ],
      "expo-web-browser",
      "expo-build-properties",
      "expo-sqlite",
      "react-native-cloud-storage",
      "react-native-edge-to-edge",
      ["react-native-cloud-storage"],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
          },
          android: {
            compileSdkVersion: 35,
          },
        },
      ],
      ["expo-font"],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText:
            "$(PRODUCT_NAME) needs access to your Camera. To Scan QR Codes.",

          // optionally, if you want to record audio:
          enableMicrophonePermission: false,
          enableCodeScanner: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "84e64d78-ead4-4ff7-b347-e68ae9a1a9b2",
      },
    },
    owner: "slashforge",
  },
};

export default config;
