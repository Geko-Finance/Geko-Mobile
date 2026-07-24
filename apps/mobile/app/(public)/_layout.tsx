import { Redirect, Stack } from "expo-router";

import { useSession } from "@/src/features/auth/session/SessionProvider";

export default function PublicLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated" || status === "locked") {
    return <Redirect href="/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
    </Stack>
  );
}
