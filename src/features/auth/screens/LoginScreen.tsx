import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useLoginMutation } from "@/src/features/auth/api/auth-queries";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const loginMutation = useLoginMutation();

  const handleDemoLogin = async () => {
    const session = await loginMutation.mutateAsync({
      email: "demo@geko.app",
      password: "demo",
    });

    await signIn(session);
    router.replace("/home");
  };

  return (
    <ScreenPlaceholder
      eyebrow="Auth"
      title="Login"
      description="Authentication starts here. Session logic will live outside route files."
      footer={
        <Pressable
          accessibilityRole="button"
          disabled={loginMutation.isPending}
          onPress={handleDemoLogin}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {loginMutation.isPending ? "Signing in..." : "Use demo session"}
          </Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#38BDF8",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#020617",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
