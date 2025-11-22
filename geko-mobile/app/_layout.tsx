import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/src/features/shared/hooks/global/use-color-scheme";

import "@/global.css";
import { BottomNavTabProvider } from "@/src/features/shared/hooks/bottom-nav-tab/useBottomNavTab";
import { GestureHandlerProvider } from "@/src/features/shared/providers/gesture-handler-provider/GestureProvider";
import { SafeAreaProvider } from "@/src/features/shared/providers/safe-area-provider";
import { GluestackUIProvider } from "@gluestack-ui-provider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="dark">
        <GestureHandlerProvider>
          <BottomSheetModalProvider>
            <BottomNavTabProvider>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="home/index"
                    options={{ title: "", headerBackTitle: "" }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ presentation: "modal", title: "Modal" }}
                  />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </BottomNavTabProvider>
          </BottomSheetModalProvider>
        </GestureHandlerProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
