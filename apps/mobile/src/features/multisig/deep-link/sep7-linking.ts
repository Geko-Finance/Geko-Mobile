import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { useWalletAccounts } from "@/src/features/wallet/state/wallet-store";

import { handleSep7Uri } from "./handle-sep7-uri";

/**
 * Registers the app to receive `web+stellar:` links opened outside the app (see the
 * `expo.scheme` array in app.json - this requires a fresh native build to take effect, a JS
 * change alone does not register the OS-level scheme on an already-installed dev client).
 * Non-SEP-7 URLs (this app's own `gekomobile://` links) are silently ignored - the auth
 * OAuth-callback flow already owns those via its own WebBrowser session, not this listener.
 * Call once from a top-level authenticated layout (see app/(app)/_layout.tsx).
 */
export function useSep7LinkingListener(): void {
  const router = useRouter();
  const { session } = useSession();
  const localAccounts = useWalletAccounts();

  useEffect(() => {
    if (session === null) {
      return;
    }

    const ownerUserId = session.user.id;

    const openIfSep7 = async (url: string) => {
      const result = await handleSep7Uri({ uri: url, ownerUserId, localAccounts });

      if (result.outcome === "opened") {
        router.push({
          pathname: "/multisig/proposal/[id]",
          params: { id: result.proposalId, accountId: result.accountId },
        });
      }
      // "ignored" (not a SEP-7 link) and "error" (bad/foreign link) both stay silent here -
      // there's no screen in context to show an inline message to for a passive cold-start
      // or backgrounded-app link open.
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void openIfSep7(url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url !== null) {
        void openIfSep7(url);
      }
    });

    return () => subscription.remove();
  }, [router, session, localAccounts]);
}
