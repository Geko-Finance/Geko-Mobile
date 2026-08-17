import { Search } from "lucide-react-native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/src/features/shared/components/BackButton";

export function NotificationsScreen() {
  const [query, setQuery] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-6 pt-4">
        <BackButton />

        <Text className="mt-4 text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          HOME
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Notifications
        </Text>

        <View className="mt-6 flex-row items-center gap-2 rounded-xl bg-[#121214] px-4 py-3">
          <Search color="#6E6E72" size={16} strokeWidth={2.25} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-[15px] font-semibold text-white"
            placeholder="Search notifications"
            placeholderTextColor="#6E6E72"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View className="flex-1 items-center justify-center pb-20">
          <Text className="text-[15px] font-semibold text-[#8E8E92]">
            No notifications yet.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
