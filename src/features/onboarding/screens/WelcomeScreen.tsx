import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useLoginMutation } from "@/src/features/auth/api/auth-queries";
import { useSession } from "@/src/features/auth/session/SessionProvider";

export function WelcomeScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const loginMutation = useLoginMutation();

  const openDashboard = async () => {
    const session = await loginMutation.mutateAsync({
      email: "demo@geko.app",
      password: "demo",
    });

    await signIn(session);
    router.replace("/home");
  };

  return (
    <ImageBackground
      source={require("@/src/assets/images/welcome/welcome-bg.png")}
      className="flex-1 bg-[#070812]"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-end px-[22px] pb-[22px]">
          <View className="mb-[14px] flex-row items-center">
            <Text className="text-[13px] font-bold text-slate-50">Geko</Text>
          </View>

          <Text className="text-[30px] font-extrabold leading-[35px] text-slate-50">
            Own Your Money,{"\n"}
            Shape <Text className="text-[#2F80FF]">Your Life.</Text>
          </Text>

          <Text className="mt-2.5 max-w-[280px] text-[13px] leading-[18px] text-[#B7C0D1]">
            From saving smart to spending wisely, your financial goals begin to
            rise.
          </Text>

          <View className="mt-4 flex-row items-center gap-1">
            <View className="h-1 w-7 rounded-sm bg-[#2F80FF]" />
            <View className="h-1 w-1 rounded-sm bg-white/20" />
            <View className="h-1 w-1 rounded-sm bg-white/20" />
          </View>

          <View className="mt-[18px] gap-[14px]">
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-[11px] bg-[#237BFF]"
              onPress={openDashboard}
            >
              <Text className="text-sm font-bold text-white">Login</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              className="h-10 items-center justify-center"
              onPress={openDashboard}
            >
              <Text className="text-sm font-bold text-slate-50">Signup</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
