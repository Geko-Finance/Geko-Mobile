import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/src/hooks/use-color-scheme";

import "@/global.css";
import { AppProviders } from "@/src/providers/app/AppProviders";
import { GestureHandlerProvider } from "@/src/providers/gesture-handler-provider/GestureProvider";
import { SafeAreaProvider } from "@/src/providers/safe-area-provider/SafeAreaProvider";
import { GluestackUIProvider } from "@gluestack-ui-provider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export const unstable_settings = {
  anchor: "(app)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="dark">
        <GestureHandlerProvider>
          <BottomSheetModalProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <AppProviders>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(public)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
                <StatusBar style="light" />
              </AppProviders>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
