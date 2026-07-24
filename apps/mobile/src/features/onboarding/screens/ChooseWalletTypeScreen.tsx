import { useRouter } from "expo-router";
import { ChevronRight, KeyRound, ShieldCheck } from "lucide-react-native";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

export function ChooseWalletTypeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          ONBOARDING
        </Text>

        <Text className="mt-2 text-[28px] font-extrabold leading-[34px] text-white">
          Choose your wallet
        </Text>

        <Text className="mt-3 text-[15px] font-semibold leading-[22px] text-[#8E8E92]">
          Pick how you want Geko to hold your keys. You can change this later.
        </Text>

        <Pressable
          accessibilityRole="button"
          className="mt-6 flex-row items-center rounded-[20px] bg-[#121214] px-4 py-4"
          onPress={() => router.push("/onboarding/custodial")}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1E1E20]">
            <ShieldCheck color="#5BED97" size={22} strokeWidth={2} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-bold text-white">Custodial</Text>
            <Text className="mt-1 text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
              Geko keeps your keys secure with Cavos. No seed phrase to write
              down or lose.
            </Text>
          </View>
          <ChevronRight color="#6E6E72" size={20} strokeWidth={2.5} />
        </Pressable>

        <View className="mt-3 flex-row items-center rounded-[20px] bg-[#121214] px-4 py-4 opacity-50">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1E1E20]">
            <KeyRound color="#8E8E92" size={22} strokeWidth={2} />
          </View>
          <View className="ml-3 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[16px] font-bold text-white">
                Non-custodial
              </Text>
              <View className="rounded-full bg-[#242426] px-2 py-0.5">
                <Text className="text-[11px] font-bold text-[#8E8E92]">
                  Coming soon
                </Text>
              </View>
            </View>
            <Text className="mt-1 text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
              Hold your own keys on-device. No third party ever sees them.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
