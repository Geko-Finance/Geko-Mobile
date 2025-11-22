import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { loginApi } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import type { LoginCredentials } from "../types";

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login: setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginApi(credentials),
    onSuccess: async (data) => {
      await setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      router.replace("/(tabs)");
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
};
