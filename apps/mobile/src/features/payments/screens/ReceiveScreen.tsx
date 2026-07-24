import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { useAccountBalances } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

export function ReceiveScreen() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const balances = useAccountBalances(activeAccount?.publicKey);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (activeAccount === null) {
      return;
    }

    await Clipboard.setStringAsync(activeAccount.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (activeAccount === null) {
    return (
      <SafeAreaView className="flex-1 bg-black px-6 pt-4">
        <View className="mb-2">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">No wallet connected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherBalances = (balances.data ?? []).filter((b) => b.asset.type !== "native");

  return (
    <SafeAreaView className="flex-1 bg-black px-6 pt-4">
      <View className="mb-2">
        <BackButton />
      </View>
      <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
        RECEIVE
      </Text>
      <Text className="mt-2 text-[28px] font-extrabold text-white">
        Your address
      </Text>

      <View className="mt-8 items-center rounded-[20px] bg-white p-5">
        <QRCode
          value={activeAccount.publicKey}
          size={200}
          backgroundColor="#FFFFFF"
          color="#000000"
        />
      </View>

      <View className="mt-4 rounded-[20px] bg-[#121214] px-4 py-4">
        <Text className="text-[15px] font-semibold text-white" selectable>
          {activeAccount.publicKey}
        </Text>
      </View>

      <Pressable
        className="mt-5 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
        onPress={handleCopy}
      >
        <Text className="text-[14px] font-bold text-white">
          {copied ? "Copied!" : "Copy address"}
        </Text>
      </Pressable>

      <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
        Share this address to receive XLM on testnet.
      </Text>

      {otherBalances.length > 0 ? (
        <View className="mt-5 overflow-hidden rounded-[20px] bg-[#121214]">
          {otherBalances.map((balance, index) => (
            <View
              key={balance.asset.id}
              className={`flex-row items-center justify-between px-4 py-3 ${
                index < otherBalances.length - 1 ? "border-b border-[#1E1E20]" : ""
              }`}
            >
              <Text className="text-[15px] font-bold text-white">{balance.asset.code}</Text>
              <Text className="text-[15px] font-semibold text-[#8E8E92]">
                {Number(balance.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
        onPress={() => router.push("/payments/add-asset")}
      >
        <Text className="text-[14px] font-bold text-white">Add asset</Text>
      </Pressable>

      <Pressable
        className="mt-8 self-start rounded-full bg-[#242426] px-4 py-2.5"
        onPress={() => router.back()}
      >
        <Text className="text-[14px] font-bold text-white">Done</Text>
      </Pressable>
    </SafeAreaView>
  );
}
