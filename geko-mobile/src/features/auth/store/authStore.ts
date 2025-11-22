import {
  deleteSecureItemAsync,
  getSecureItemAsync,
  setSecureItemAsync,
} from "@shared/utils/app/SecureStore";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthState, AuthUser } from "../types";

interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: async (token) => {
        if (token) {
          await setSecureItemAsync(TOKEN_KEY, token);
        } else {
          await deleteSecureItemAsync(TOKEN_KEY);
        }
        set({ token, isAuthenticated: !!token });
      },

      login: async (user, token) => {
        await setSecureItemAsync(TOKEN_KEY, token);
        await setSecureItemAsync(USER_KEY, JSON.stringify(user));

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: async () => {
        await deleteSecureItemAsync(TOKEN_KEY);
        await deleteSecureItemAsync(USER_KEY);

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => ({
        getItem: async () => {
          const userStr = await getSecureItemAsync(USER_KEY);
          return userStr ? JSON.stringify({ user: JSON.parse(userStr) }) : null;
        },
        setItem: async () => {},
        removeItem: async () => {},
      })),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const initializeAuth = async () => {
  const token = await getSecureItemAsync(TOKEN_KEY);
  const userStr = await getSecureItemAsync(USER_KEY);

  if (token && userStr) {
    const user = JSON.parse(userStr);
    useAuthStore.setState({
      user,
      token,
      isAuthenticated: true,
    });
  }
};
