import type {
  AuthResponse,
  LoginCredentials,
  SignUpCredentials,
} from "../types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const loginApi = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  await delay(1000);

  if (!credentials.email || !credentials.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  const mockResponse: AuthResponse = {
    user: {
      id: "1",
      email: credentials.email,
      name: "Usuario Mock",
    },
    token: "mock-jwt-token-12345",
    refreshToken: "mock-refresh-token-12345",
  };

  return mockResponse;
};

export const signUpApi = async (
  credentials: SignUpCredentials
): Promise<AuthResponse> => {
  await delay(1000);

  if (!credentials.email || !credentials.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  const mockResponse: AuthResponse = {
    user: {
      id: "1",
      email: credentials.email,
      name: credentials.name || "Usuario Nuevo",
    },
    token: "mock-jwt-token-12345",
    refreshToken: "mock-refresh-token-12345",
  };

  return mockResponse;
};

export const logoutApi = async (): Promise<void> => {
  await delay(500);
  return Promise.resolve();
};
