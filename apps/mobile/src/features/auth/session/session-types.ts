export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

export interface Session {
  user: SessionUser;
  tokens?: SessionTokens;
}

/**
 * - `loading`: bootstrap in progress
 * - `authenticated`: valid session, app unlocked
 * - `locked`: stored session with tokens exists, awaiting Face ID / biometric unlock
 * - `anonymous`: no session
 */
export type SessionStatus =
  | "loading"
  | "authenticated"
  | "locked"
  | "anonymous";
