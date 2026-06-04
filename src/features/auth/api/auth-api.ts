import type { CustomerProfile } from "@/src/domain/customer";
import type { Session } from "@/src/features/auth/session/session-types";

interface LoginInput {
  email: string;
  password: string;
}

const MOCK_USER: CustomerProfile = {
  email: "demo@geko.app",
  fullName: "Geko Demo",
  id: "customer_demo",
};

export async function login(input: LoginInput): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    user: {
      email: input.email || MOCK_USER.email,
      id: MOCK_USER.id,
    },
    tokens: {
      accessToken: "mock_access_token",
      expiresAt: Date.now() + 1000 * 60 * 15,
      refreshToken: "mock_refresh_token",
    },
  };
}

export async function getMe(): Promise<CustomerProfile> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  return MOCK_USER;
}
