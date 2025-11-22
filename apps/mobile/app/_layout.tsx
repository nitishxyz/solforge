import { RootProvider } from "@/providers/root-provider";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

function RootLayout() {


  useEffect(() => {
      SplashScreen.hideAsync();
  }, []);

  return (
    <RootProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="export-key" options={{ presentation: 'modal' }} />
      </Stack>
    </RootProvider>
  );
}

export default RootLayout;
