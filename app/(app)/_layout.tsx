import { Redirect, Stack, usePathname } from "expo-router";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { useWalletAccounts } from "@/src/features/wallet/state/wallet-store";

export default function AppLayout() {
  const { status } = useSession();
  const accounts = useWalletAccounts();
  const pathname = usePathname();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous") {
    return <Redirect href="/welcome" />;
  }

  // Persistent guard, not a one-shot post-login check: an authenticated user with
  // no owned wallet must always land in onboarding, no matter how they got here
  // (fresh login, a Fast Refresh reload mid-onboarding, relaunching the app with an
  // existing session, back-navigation) - otherwise the Stack below just defaults to
  // its first screen, (tabs)/Home, silently stranding them with no wallet and no way
  // back into onboarding. The pathname check avoids redirect-looping the onboarding
  // screens themselves while the user is legitimately there with zero accounts yet.
  if (accounts.length === 0 && !pathname.startsWith("/onboarding")) {
    return <Redirect href="/onboarding/choose-wallet" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wallet/index" />
      <Stack.Screen name="wallet/[accountId]" />
      <Stack.Screen name="onboarding/choose-wallet" />
      <Stack.Screen name="onboarding/custodial" />
      <Stack.Screen name="payments/send-options" />
      <Stack.Screen name="payments/send" />
      <Stack.Screen name="payments/receive" />
      <Stack.Screen name="payments/scan" />
      <Stack.Screen name="payments/add-asset" />
      <Stack.Screen name="payments/confirm" />
      <Stack.Screen name="payments/success" />
      <Stack.Screen name="kyc/index" />
      <Stack.Screen name="kyc/document" />
      <Stack.Screen name="kyc/selfie" />
      <Stack.Screen name="kyc/review" />
    </Stack>
  );
}
