import { RootProvider } from "@/providers/root-provider";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

function RootLayout() {


  useEffect(() => {
      SplashScreen.hideAsync();
  }, []);

  return (
    <RootProvider>
      <Slot />
    </RootProvider>
  );
}

export default RootLayout;
