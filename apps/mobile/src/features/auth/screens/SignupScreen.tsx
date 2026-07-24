import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useSendOtp,
  useSocialLogin,
  useVerifyOtp,
} from "@/src/features/auth/api/cavos-auth-queries";
import {
  toAppSession,
  type AuthSessionResult,
} from "@/src/features/auth/api/auth-client";
import { useSession } from "@/src/features/auth/session/SessionProvider";

export function SignupScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const googleLogin = useSocialLogin("google");
  const appleLogin = useSocialLogin("apple");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const finishSignup = async (authSession: AuthSessionResult) => {
    await signIn(toAppSession(authSession));
    // (app)/_layout.tsx's wallet-ownership guard takes it from here - it redirects
    // to onboarding itself if this session's user doesn't own a wallet yet.
    router.replace("/home");
  };

  const handleSendCode = async () => {
    try {
      await sendOtp.mutateAsync(email.trim());
      setCodeSent(true);
    } catch {
      // sendOtp.isError drives inline error display below.
    }
  };

  const handleVerifyCode = async () => {
    try {
      const authSession = await verifyOtp.mutateAsync({
        email: email.trim(),
        code: code.trim(),
      });
      await finishSignup(authSession);
    } catch {
      // verifyOtp.isError drives inline error display below.
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const authSession = await googleLogin.mutateAsync();
      await finishSignup(authSession);
    } catch {
      // googleLogin.isError drives inline error display below.
    }
  };

  const handleAppleLogin = async () => {
    try {
      const authSession = await appleLogin.mutateAsync();
      await finishSignup(authSession);
    } catch {
      // appleLogin.isError drives inline error display below.
    }
  };

  const isSocialPending = googleLogin.isPending || appleLogin.isPending;

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

          <View className="mt-6 gap-2.5">
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-[11px] bg-white"
              disabled={isSocialPending}
              onPress={handleGoogleLogin}
            >
              {googleLogin.isPending ? (
                <ActivityIndicator color="#070812" size="small" />
              ) : (
                <Text className="text-sm font-bold text-[#070812]">
                  Continue with Google
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-[11px] bg-black"
              disabled={isSocialPending}
              onPress={handleAppleLogin}
            >
              {appleLogin.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  Continue with Apple
                </Text>
              )}
            </Pressable>

            {googleLogin.isError || appleLogin.isError ? (
              <Text className="text-[13px] font-semibold text-[#FF6B6B]">
                Sign-in failed. Please try again.
              </Text>
            ) : null}
          </View>

          <View className="mt-5 flex-row items-center gap-3">
            <View className="h-[1px] flex-1 bg-[#242426]" />
            <Text className="text-[12px] font-bold text-[#6E6E72]">OR</Text>
            <View className="h-[1px] flex-1 bg-[#242426]" />
          </View>

          <View className="mt-5 rounded-[20px] bg-[#121214] px-4 py-4">
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              editable={!codeSent}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#6E6E72"
              value={email}
              onChangeText={setEmail}
            />

            {codeSent ? (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                keyboardType="number-pad"
                placeholder="6-digit code"
                placeholderTextColor="#6E6E72"
                value={code}
                onChangeText={setCode}
              />
            ) : null}

            {sendOtp.isError ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                Couldn&apos;t send a code - please check the email and try again.
              </Text>
            ) : null}

            {verifyOtp.isError ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                That code didn&apos;t work - please try again.
              </Text>
            ) : null}
          </View>

          {codeSent ? (
            <Pressable
              accessibilityRole="button"
              className="mt-[18px] h-12 items-center justify-center rounded-[11px] bg-[#237BFF]"
              disabled={code.trim().length === 0 || verifyOtp.isPending}
              onPress={handleVerifyCode}
            >
              {verifyOtp.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-sm font-bold text-white">
                    Verifying…
                  </Text>
                </View>
              ) : (
                <Text className="text-sm font-bold text-white">
                  Verify &amp; create account
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="mt-[18px] h-12 items-center justify-center rounded-[11px] bg-[#237BFF]"
              disabled={email.trim().length === 0 || sendOtp.isPending}
              onPress={handleSendCode}
            >
              {sendOtp.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-sm font-bold text-white">
                    Sending code…
                  </Text>
                </View>
              ) : (
                <Text className="text-sm font-bold text-white">Send code</Text>
              )}
            </Pressable>
          )}

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
