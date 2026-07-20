import { Redirect, Stack } from "expo-router";

import { useSession } from "@/src/features/auth/session/SessionProvider";

export default function AppLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wallet/index" />
      <Stack.Screen name="wallet/[accountId]" />
      <Stack.Screen name="payments/send" />
      <Stack.Screen name="payments/confirm" />
      <Stack.Screen name="payments/success" />
      <Stack.Screen name="kyc/index" />
      <Stack.Screen name="kyc/document" />
      <Stack.Screen name="kyc/selfie" />
      <Stack.Screen name="kyc/review" />
    </Stack>
  );
}
