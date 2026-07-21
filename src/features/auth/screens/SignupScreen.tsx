import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useLoginMutation } from "@/src/features/auth/api/auth-queries";
import { resolvePostLoginRoute } from "@/src/features/auth/session/post-login-route";
import { useSession } from "@/src/features/auth/session/SessionProvider";

// No real signup/register API exists yet — signup reuses the mocked login() call as a stopgap.
export function SignupScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isSubmitDisabled =
    email.trim().length === 0 ||
    password.length === 0 ||
    !passwordsMatch ||
    loginMutation.isPending;

  const handleSignup = async () => {
    try {
      const session = await loginMutation.mutateAsync({
        email: email.trim(),
        password,
      });
      await signIn(session);
      router.replace(resolvePostLoginRoute());
    } catch {
      // Mutation isError/error state drives inline error display below.
    }
  };

  return (
    <ImageBackground
      source={require("@/src/assets/images/welcome/welcome-bg.png")}
      className="flex-1 bg-[#070812]"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-end px-[22px] pb-[22px]">
          <Text className="mb-[14px] text-[13px] font-bold text-slate-50">
            Geko
          </Text>

          <Text className="text-[30px] font-extrabold leading-[35px] text-slate-50">
            Create your account
          </Text>

          <Text className="mt-2.5 text-[13px] leading-[18px] text-[#B7C0D1]">
            Sign up to create your Geko wallet.
          </Text>

          <View className="mt-6 rounded-[20px] bg-[#121214] px-4 py-4">
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#6E6E72"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              placeholder="Password"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              placeholder="Confirm password"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {confirmPassword.length > 0 && !passwordsMatch ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                Passwords don&apos;t match.
              </Text>
            ) : null}

            {loginMutation.isError ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                Something went wrong. Please try again.
              </Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            className="mt-[18px] h-12 items-center justify-center rounded-[11px] bg-[#237BFF]"
            disabled={isSubmitDisabled}
            onPress={handleSignup}
          >
            {loginMutation.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-sm font-bold text-white">
                  Creating account…
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-white">Sign up</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-3 h-10 items-center justify-center"
            onPress={() => router.replace("/login")}
          >
            <Text className="text-sm font-bold text-slate-50">
              Already have an account? Log in
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
