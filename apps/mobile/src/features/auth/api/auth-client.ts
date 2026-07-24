import { appConfig } from "@/src/config/env";

import type { Session, SessionTokens } from "@/src/features/auth/session/session-types";

/**
 * Session minted by the Geko backend after OTP or OAuth verification.
 * `displayName` is mapped to `SessionUser.name` at this boundary.
 */
export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export type OAuthProvider = "google" | "apple";

const authApiUrl = (path: string): string => `${appConfig.backendUrl}${path}`;

/**
 * Decode the access JWT's `exp` claim to a millisecond epoch.
 * Tokens are base64url-encoded; no signature verification — we only need expiry.
 */
export function getAccessTokenExpiresAt(accessToken: string): number {
  const payloadSegment = accessToken.split(".")[1];

  if (!payloadSegment) {
    throw new Error("Invalid access token");
  }

  const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const payload = JSON.parse(atob(padded)) as { exp?: unknown };

  if (typeof payload.exp !== "number") {
    throw new Error("Access token missing exp claim");
  }

  return payload.exp * 1000;
}

export function toAppSession(result: AuthSessionResult): Session {
  const tokens: SessionTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: getAccessTokenExpiresAt(result.accessToken),
  };

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.displayName ?? undefined,
    },
    tokens,
  };
}

export async function sendOtp(email: string): Promise<void> {
  const response = await fetch(authApiUrl("/auth/otp/send"), {
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
): Promise<AuthSessionResult> {
  const response = await fetch(authApiUrl("/auth/otp/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    throw new Error(`Verification failed (${response.status})`);
  }

  return (await response.json()) as AuthSessionResult;
}

export async function getOAuthUrl(
  provider: OAuthProvider,
  redirectUri: string
): Promise<string> {
  const response = await fetch(
    authApiUrl(
      `/auth/oauth/${provider}/url?redirectUri=${encodeURIComponent(redirectUri)}`
    )
  );

  if (!response.ok) {
    throw new Error(`Failed to start ${provider} sign-in (${response.status})`);
  }

  const { url } = (await response.json()) as { url: string };
  return url;
}

export async function completeOAuthCallback(
  authData: string,
  provider: OAuthProvider
): Promise<AuthSessionResult> {
  const response = await fetch(authApiUrl(`/auth/oauth/${provider}/callback`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authData }),
  });

  if (!response.ok) {
    throw new Error(`Sign-in failed (${response.status})`);
  }

  return (await response.json()) as AuthSessionResult;
}

export async function refresh(refreshToken: string): Promise<AuthSessionResult> {
  const response = await fetch(authApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Session refresh failed (${response.status})`);
  }

  return (await response.json()) as AuthSessionResult;
}

/**
 * JWT-guarded logout. Callers must supply the current access token for the
 * Authorization header; failures should not block local sign-out.
 */
export async function logout(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const response = await fetch(authApiUrl("/auth/logout"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Logout failed (${response.status})`);
  }
}
