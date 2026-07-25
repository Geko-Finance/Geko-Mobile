import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { useAccountBalances } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { buildSep7PayUri } from "@/src/services/sep7/sep7-pay-uri";

export function ReceiveScreen() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const balances = useAccountBalances(activeAccount?.publicKey);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<{
    code: string;
    issuer: string;
  } | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [memo, setMemo] = useState("");

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
  const assetCode = selectedAsset?.code ?? "XLM";
  const trimmedAmount = amount.trim();
  const trimmedMemo = memo.trim();
  const isRequestingAmount = trimmedAmount.length > 0;
  const qrValue = isRequestingAmount
    ? buildSep7PayUri({
        destination: activeAccount.publicKey,
        amount: trimmedAmount,
        ...(selectedAsset !== null ? { asset: selectedAsset } : {}),
        ...(trimmedMemo.length > 0 ? { memo: trimmedMemo } : {}),
      })
    : activeAccount.publicKey;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            value={qrValue}
            size={200}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
        </View>
        {isRequestingAmount ? (
          <Text className="mt-3 text-center text-[13px] font-semibold text-[#8E8E92]">
            {`This code also requests ${trimmedAmount} ${assetCode}`}
          </Text>
        ) : null}

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

        <View className="relative mt-5 rounded-[20px] bg-[#121214] px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-bold text-white">
              Request an amount
            </Text>
            <Pressable
              className="flex-row items-center gap-1 rounded-full bg-[#1E1E20] px-3 py-1.5"
              onPress={() => setAssetPickerOpen((open) => !open)}
            >
              <View className="h-5 w-5 items-center justify-center rounded-full bg-[#242426]">
                <Text className="text-[10px] font-extrabold text-white">
                  {assetCode.charAt(0)}
                </Text>
              </View>
              <Text className="text-[13px] font-bold text-white">{assetCode}</Text>
              <ChevronDown color="#8E8E92" size={14} strokeWidth={2.5} />
            </Pressable>
          </View>
          {assetPickerOpen ? (
            <View
              className="absolute right-4 top-14 z-10 overflow-hidden rounded-xl bg-[#242426]"
              style={{
                elevation: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Pressable
                className="flex-row items-center justify-between border-b border-[#242426] px-3 py-2.5"
                onPress={() => {
                  setSelectedAsset(null);
                  setAssetPickerOpen(false);
                }}
              >
                <Text className="text-[14px] font-bold text-white">XLM</Text>
                {selectedAsset === null ? (
                  <Text className="ml-3 text-[12px] font-bold text-[#5BED97]">
                    Selected
                  </Text>
                ) : null}
              </Pressable>
              {otherBalances.map((balance) => (
                <Pressable
                  key={balance.asset.id}
                  className="flex-row items-center justify-between border-b border-[#242426] px-3 py-2.5"
                  onPress={() => {
                    setSelectedAsset({
                      code: balance.asset.code,
                      issuer: balance.asset.issuer!,
                    });
                    setAssetPickerOpen(false);
                  }}
                >
                  <Text className="text-[14px] font-bold text-white">
                    {balance.asset.code}
                  </Text>
                  {selectedAsset?.code === balance.asset.code ? (
                    <Text className="ml-3 text-[12px] font-bold text-[#5BED97]">
                      Selected
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            className="mt-3 text-[32px] font-extrabold text-white"
            placeholder="0"
            placeholderTextColor="#3A3A3C"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            onFocus={() => setAssetPickerOpen(false)}
          />
          <TextInput
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[14px] font-semibold text-white"
            placeholder="Memo (optional)"
            placeholderTextColor="#6E6E72"
            maxLength={28}
            value={memo}
            onChangeText={setMemo}
          />
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
