import { Redirect, Stack, usePathname } from "expo-router";

import { UnlockScreen } from "@/src/features/auth/screens/UnlockScreen";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { useSep7LinkingListener } from "@/src/features/multisig/deep-link/sep7-linking";
import { useWalletAccounts } from "@/src/features/wallet/state/wallet-store";

export default function AppLayout() {
  const { status } = useSession();
  const accounts = useWalletAccounts();
  const pathname = usePathname();

  // Called unconditionally (Rules of Hooks) - the hook itself no-ops until there's a signed-in
  // session, same guard every other early return below relies on.
  useSep7LinkingListener();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous") {
    return <Redirect href="/welcome" />;
  }

  if (status === "locked") {
    return <UnlockScreen />;
  }

  // Persistent guard, not a one-shot post-login check: an authenticated user with
  // no owned wallet must always land in onboarding, no matter how they got here
  // (fresh login, a Fast Refresh reload mid-onboarding, relaunching the app with an
  // existing session, back-navigation) - otherwise the Stack below just defaults to
  // its first screen, (tabs)/Home, silently stranding them with no wallet and no way
  // back into onboarding. wallet/create and wallet/import are the non-custodial
  // epic's own first-wallet entry points, so they're allowed alongside onboarding/*
  // to avoid bouncing a walletless user straight back out of them.
  const isWalletSetupRoute =
    pathname.startsWith("/onboarding") ||
    pathname === "/wallet/create" ||
    pathname === "/wallet/import";

  if (accounts.length === 0 && !isWalletSetupRoute) {
    return <Redirect href="/onboarding/choose-wallet" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wallet/index" />
      <Stack.Screen name="wallet/[accountId]" />
      <Stack.Screen name="onboarding/choose-wallet" />
      <Stack.Screen name="onboarding/custodial" />
      <Stack.Screen name="wallet/create" />
      <Stack.Screen name="wallet/import" />
      <Stack.Screen name="contacts/index" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="payments/send-options" />
      <Stack.Screen name="payments/send" />
      <Stack.Screen name="payments/receive" />
      <Stack.Screen name="payments/scan" />
      <Stack.Screen name="payments/add-asset" />
      <Stack.Screen name="payments/confirm" />
      <Stack.Screen name="payments/success" />
      <Stack.Screen name="cctp/index" />
      <Stack.Screen name="cctp/status" />
      <Stack.Screen name="multisig/index" />
      <Stack.Screen name="multisig/add-signer" />
      <Stack.Screen name="multisig/edit-thresholds" />
      <Stack.Screen name="multisig/pending" />
      <Stack.Screen name="multisig/proposal/[id]" />
      <Stack.Screen name="multisig/scan" />
      <Stack.Screen name="kyc/index" />
      <Stack.Screen name="kyc/document" />
      <Stack.Screen name="kyc/selfie" />
      <Stack.Screen name="kyc/review" />
      <Stack.Screen name="profile/notification-preferences" />
    </Stack>
  );
}
