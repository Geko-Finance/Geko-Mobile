import { useRouter } from "expo-router";
import { ArrowUpRight, ChevronRight, Globe, QrCode } from "lucide-react-native";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { canSend } from "@/src/domain/wallet";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

export function SendOptionsScreen() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const [showChainsComingSoon, setShowChainsComingSoon] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <BackButton />
        </View>

        <Text className="text-[32px] font-extrabold leading-[38px] text-white">
          How do you want{"\n"}to send?
        </Text>

        <View className="mt-8 flex-row gap-3">
          <Pressable
            className="flex-1 rounded-[20px] bg-[#121214] px-4 py-5"
            onPress={() => router.push("/payments/send")}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-[#123B2B]">
              <ArrowUpRight color="#5BED97" size={18} strokeWidth={2.5} />
            </View>
            <Text className="mt-4 text-[15px] font-extrabold text-white">
              Send on{"\n"}Stellar
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
              To any G... address
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 rounded-[20px] bg-[#121214] px-4 py-5 opacity-50"
            onPress={() => setShowChainsComingSoon(true)}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-[#1E1E20]">
              <Globe color="#8E8E92" size={18} strokeWidth={2.5} />
            </View>
            <Text className="mt-4 text-[15px] font-extrabold text-white">
              Other{"\n"}chains
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
              Coming soon
            </Text>
          </Pressable>
        </View>

        {showChainsComingSoon ? (
          <Pressable
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3"
            onPress={() => setShowChainsComingSoon(false)}
          >
            <Text className="text-[13px] font-semibold text-[#8E8E92]">
              Other chains are coming soon.
            </Text>
          </Pressable>
        ) : null}

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
          <Pressable
            className="flex-row items-center border-b border-[#1E1E20] px-4 py-4"
            onPress={() => router.push("/payments/scan")}
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1E1E20]">
              <QrCode color="#FFFFFF" size={20} strokeWidth={2.25} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-bold text-white">QR payment</Text>
              <Text className="mt-0.5 text-[13px] font-semibold text-[#8E8E92]">
                Scan any Stellar address QR
              </Text>
            </View>
            <ChevronRight color="#77777B" size={18} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            className="flex-row items-center px-4 py-4"
            onPress={() => router.push("/payments/send")}
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1E1E20]">
              <ArrowUpRight color="#FFFFFF" size={20} strokeWidth={2.25} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-bold text-white">
                Enter address manually
              </Text>
              <Text className="mt-0.5 text-[13px] font-semibold text-[#8E8E92]">
                Type or paste a G... address
              </Text>
            </View>
            <ChevronRight color="#77777B" size={18} strokeWidth={2.5} />
          </Pressable>
        </View>

        {activeAccount !== null && !canSend(activeAccount) ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
            {activeAccount.name} can&apos;t send — switch to a custodial wallet to
            send payments.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
