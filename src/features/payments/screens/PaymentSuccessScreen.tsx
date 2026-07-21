import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-black px-6"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-[28px] font-extrabold text-white">Payment sent</Text>
      <Text className="mt-3 text-center text-[15px] font-semibold text-[#8E8E92]">
        Your payment was submitted to the network.
      </Text>
      <Pressable
        accessibilityLabel="Done"
        accessibilityRole="button"
        className="mt-8 rounded-full bg-[#242426] px-5 py-3"
        onPress={() => router.replace("/(app)/(tabs)/home")}
      >
        <Text className="text-[14px] font-bold text-white">Done</Text>
      </Pressable>
    </View>
  );
}
