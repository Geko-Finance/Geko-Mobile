import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { logoutApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout: clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: async () => {
      await clearAuth();
      queryClient.clear();
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      clearAuth();
      router.replace('/(auth)/login');
      console.error('Logout error:', error);
    },
  });
};

