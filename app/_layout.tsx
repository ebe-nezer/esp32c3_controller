import { SplashScreen, Stack } from "expo-router";
import { Icon, PaperProvider, useTheme } from "react-native-paper";
import {
  Syne_400Regular,
  Syne_500Medium,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from "@expo-google-fonts/syne";
import { useFonts } from "@expo-google-fonts/syne/useFonts";
import { useEffect, useState } from "react";
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
          <Routes />
        </PaperProvider>
      </GestureHandlerRootView>
    )
  );
}

const Routes = () => {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="device">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="device" options={{ headerShown: false }} />
    </Stack>
  );
};
