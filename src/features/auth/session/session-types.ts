export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SessionUser {
  id: string;
  email?: string;
}

export interface Session {
  user: SessionUser;
  tokens: SessionTokens;
}

export type SessionStatus = "loading" | "authenticated" | "anonymous";
