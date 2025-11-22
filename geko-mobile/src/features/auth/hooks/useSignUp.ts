import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { signUpApi } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import type { SignUpCredentials } from "../types";

export const useSignUp = () => {
  const queryClient = useQueryClient();
  const { login: setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: SignUpCredentials) => signUpApi(credentials),
    onSuccess: async (data) => {
      await setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      router.replace("/(tabs)");
    },
    onError: (error) => {
      console.error("SignUp error:", error);
    },
  });
};
