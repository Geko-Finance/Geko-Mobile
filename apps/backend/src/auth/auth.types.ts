export type AuthSessionResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
};

export type OAuthProvider = 'google' | 'apple';

export type SessionMeta = {
  ipAddress?: string;
  userAgent?: string;
};
