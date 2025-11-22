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
import { AuthGuard } from "@/src/features/auth/components/AuthGuard";
import { initializeAuth } from "@/src/features/auth/store/authStore";
import { BottomNavTabProvider } from "@/src/features/shared/hooks/bottom-nav-tab/useBottomNavTab";
import { GestureHandlerProvider } from "@/src/features/shared/providers/gesture-handler-provider/GestureProvider";
import { QueryClientProvider } from "@/src/features/shared/providers/query-client-provider";
import { SafeAreaProvider } from "@/src/features/shared/providers/safe-area-provider";
import { GluestackUIProvider } from "@gluestack-ui-provider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };
    init();
  }, []);

  if (!isInitialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider>
        <GluestackUIProvider mode="dark">
          <GestureHandlerProvider>
            <BottomSheetModalProvider>
              <BottomNavTabProvider>
                <AuthGuard>
                  <ThemeProvider
                    value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                  >
                    <Stack>
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
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
                </AuthGuard>
              </BottomNavTabProvider>
            </BottomSheetModalProvider>
          </GestureHandlerProvider>
        </GluestackUIProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
