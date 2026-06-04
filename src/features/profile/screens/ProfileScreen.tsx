import { Pressable, StyleSheet, Text } from "react-native";

import { useMeQuery } from "@/src/features/auth/api/auth-queries";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";

export function ProfileScreen() {
  const { session, signOut, status } = useSession();
  const meQuery = useMeQuery(status === "authenticated");
  const displayName = meQuery.data?.fullName ?? session?.user.email ?? "Customer";

  return (
    <ScreenPlaceholder
      eyebrow="App"
      title="Profile"
      description={`Signed in as ${displayName}. Customer profile, settings, and support entry points.`}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "#38BDF8",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
