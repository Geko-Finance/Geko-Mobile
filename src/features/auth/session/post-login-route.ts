import { useWalletStore } from "@/src/features/wallet/state/wallet-store";

/**
 * Returns where to send the user immediately after `signIn()` succeeds:
 * onboarding when no local wallet exists yet, home otherwise.
 */
export function resolvePostLoginRoute(): "/home" | "/onboarding/custodial" {
  return useWalletStore.getState().accounts.length > 0
    ? "/home"
    : "/onboarding/custodial";
}
