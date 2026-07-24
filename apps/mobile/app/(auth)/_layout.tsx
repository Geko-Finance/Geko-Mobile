import { Redirect, Stack } from "expo-router";

import { useSession } from "@/src/features/auth/session/SessionProvider";

export default function AuthLayout() {
  const { status } = useSession();

  if (status === "authenticated" || status === "locked") {
    return <Redirect href="/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
