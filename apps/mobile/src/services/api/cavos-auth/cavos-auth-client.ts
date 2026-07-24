import { appConfig } from "@/src/config/env";

/**
 * Identity resolved by Cavos hosted auth (email OTP or Google/Apple OAuth).
 * Matches the shape CavosIdentity needs for wallet connect, plus an optional
 * display name (only OAuth providers populate one).
 */
export interface ResolvedAuthIdentity {
  readonly userId: string;
  readonly email?: string;
  readonly name?: string;
}

export type OAuthProvider = "google" | "apple";

const cavosAuthApiUrl = (path: string): string =>
  `${appConfig.cavosBackendUrl}${path}`;

export async function sendOtp(email: string): Promise<void> {
  const response = await fetch(cavosAuthApiUrl("/api/auth/otp/send"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send verification code (${response.status})`);
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<ResolvedAuthIdentity> {
  const response = await fetch(cavosAuthApiUrl("/api/auth/otp/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    throw new Error(`Verification failed (${response.status})`);
  }

  return (await response.json()) as ResolvedAuthIdentity;
}

export async function getOAuthUrl(
  provider: OAuthProvider,
  redirectUri: string
): Promise<string> {
  const response = await fetch(
    cavosAuthApiUrl(
      `/api/auth/oauth/${provider}-url?redirectUri=${encodeURIComponent(redirectUri)}`
    )
  );

  if (!response.ok) {
    throw new Error(`Failed to start ${provider} sign-in (${response.status})`);
  }

  const { url } = (await response.json()) as { url: string };
  return url;
}

export async function completeOAuthCallback(
  authData: string
): Promise<ResolvedAuthIdentity> {
  const response = await fetch(cavosAuthApiUrl("/api/auth/oauth/callback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authData }),
  });

  if (!response.ok) {
    throw new Error(`Sign-in failed (${response.status})`);
  }

  return (await response.json()) as ResolvedAuthIdentity;
}
