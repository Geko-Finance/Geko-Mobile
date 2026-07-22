import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";

export function PaymentSuccessScreen() {
  const router = useRouter();
  const { destination, amount, hash, assetCode } = useLocalSearchParams<{
    destination: string;
    amount: string;
    hash?: string;
    assetCode?: string;
  }>();

  return (
    <SafeAreaView className="flex-1 bg-black items-center justify-center px-7">
      <View className="rounded-full bg-[#123B2B] px-4 py-2">
        <Text className="text-[13px] font-bold text-[#5BED97]">
          Payment sent
        </Text>
      </View>

      <Text className="mt-6 text-[22px] font-extrabold text-white text-center">
        {`${amount} ${assetCode || "XLM"} sent`}
      </Text>

      <Text className="mt-2 text-[14px] font-semibold text-[#8E8E92] text-center">
        {`to ${destination.slice(0, 6)}…${destination.slice(-6)}`}
      </Text>

      {hash ? (
        <View className="mt-6 w-full rounded-[16px] bg-[#121214] px-4 py-3">
          <Text className="text-[12px] font-bold uppercase tracking-wide text-[#8E8E92]">
            Transaction hash
          </Text>
          <Text className="mt-1 text-[12px] font-semibold text-[#5BED97] text-center">
            {hash}
          </Text>
        </View>
      ) : null}

      <Pressable
        className="mt-8 rounded-full bg-[#242426] px-6 py-3"
        onPress={() => router.replace("/home")}
      >
        <Text className="text-[14px] font-bold text-white">Done</Text>
      </Pressable>
    </SafeAreaView>
  );
}
