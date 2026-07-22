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
  // Cavos hosted auth resolves an Identity directly - there is no access/refresh
  // token pair the app ever sees, unlike a classic username/password backend.
  tokens?: SessionTokens;
}

export type SessionStatus = "loading" | "authenticated" | "anonymous";
