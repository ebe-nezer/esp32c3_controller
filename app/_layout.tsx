import { router, SplashScreen, Stack } from "expo-router";
import { Icon, PaperProvider, useTheme } from "react-native-paper";
import {
  Syne_400Regular,
  Syne_500Medium,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from "@expo-google-fonts/syne";
import { useFonts } from "@expo-google-fonts/syne/useFonts";
import React, { useEffect, useState } from "react";
import { darkTheme, lightTheme } from "../lib/theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Syne_400Regular,
    Syne_500Medium,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setLoading(false);
    }
  }, [fontsLoaded]);

  const isDarkMode = useTheme().dark;

  return (
    !loading &&
    fontsLoaded && (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
          <Routes canRedirect={!loading && fontsLoaded} />
        </PaperProvider>
      </GestureHandlerRootView>
    )
  );
}

const Routes = ({ canRedirect }: { canRedirect: boolean }) => {
  React.useEffect(() => {
    if (!canRedirect) return;
    router.replace("/splash");
  }, [canRedirect]);
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="splash">
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="splash" options={{ headerShown: false }} />
      <Stack.Screen name="device" options={{ headerShown: false }} />
    </Stack>
  );
};
