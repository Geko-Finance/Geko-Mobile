import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import {
  completeOAuthCallback,
  getOAuthUrl,
  sendOtp,
  verifyOtp,
  type OAuthProvider,
  type ResolvedAuthIdentity,
} from "@/src/services/api/cavos-auth/cavos-auth-client";

export class OAuthCancelledError extends Error {
  constructor() {
    super("Sign-in was cancelled");
    this.name = "OAuthCancelledError";
  }
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (email: string) => sendOtp(email),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyOtp(email, code),
  });
}

/** Opens the Cavos-hosted Google/Apple sign-in page and resolves once the user completes it. */
export function useSocialLogin(provider: OAuthProvider) {
  return useMutation({
    mutationFn: async (): Promise<ResolvedAuthIdentity> => {
      const redirectUri = Linking.createURL("auth-callback");
      const url = await getOAuthUrl(provider, redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      if (result.type !== "success") {
        throw new OAuthCancelledError();
      }

      return completeOAuthCallback(result.url);
    },
  });
}
