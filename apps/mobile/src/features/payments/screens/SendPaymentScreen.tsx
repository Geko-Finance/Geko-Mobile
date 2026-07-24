import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, ChevronRight, QrCode } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { canSend, isLikelyStellarPublicKey } from "@/src/domain/wallet";
import { useAccountBalances } from "@/src/features/wallet/api/wallet-queries";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

export function SendPaymentScreen() {
  const router = useRouter();
  const { scannedAddress } = useLocalSearchParams<{ scannedAddress?: string }>();
  const activeAccount = useActiveAccount();
  const balances = useAccountBalances(activeAccount?.publicKey);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [editingDestination, setEditingDestination] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<{
    code: string;
    issuer: string;
  } | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (typeof scannedAddress === "string" && scannedAddress.length > 0) {
      setDestination(scannedAddress);
      setEditingDestination(false);
    }
  }, [scannedAddress]);

  if (activeAccount === null) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="mb-2 px-6 pt-4">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">No wallet connected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canSend(activeAccount)) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="mb-2 px-6 pt-4">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[15px] font-semibold text-[#8E8E92] px-6 text-center">
            {activeAccount.name} can&apos;t send payments — it doesn&apos;t hold
            signing keys.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-full bg-[#242426] px-4 py-2.5"
            onPress={() => router.push("/wallet")}
          >
            <Text className="text-[14px] font-bold text-white">Switch account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const heldAssets = (balances.data ?? []).filter((b) => b.asset.type !== "native");

  const trimmedDestination = destination.trim();
  const trimmedAmount = amount.trim();
  const destinationValid =
    isLikelyStellarPublicKey(trimmedDestination) &&
    trimmedDestination !== activeAccount.publicKey;
  const parsedAmount = Number(trimmedAmount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const formValid = destinationValid && amountValid;
  const showHint =
    (!destinationValid && trimmedDestination.length > 0) ||
    (!amountValid && trimmedAmount.length > 0);

  const assetCode = selectedAsset?.code ?? "XLM";
  const balanceEntry =
    selectedAsset === null
      ? (balances.data ?? []).find((b) => b.asset.type === "native")
      : heldAssets.find((b) => b.asset.code === selectedAsset.code);
  const availableBalance = balanceEntry ? Number(balanceEntry.amount) : 0;
  const availableLabel = balanceEntry
    ? `${Number(balanceEntry.amount).toFixed(2)} ${assetCode} available`
    : `0.00 ${assetCode} available`;

  const setPercentageAmount = (fraction: number) => {
    setAmount((availableBalance * fraction).toFixed(2));
  };

  const setMaxAmount = () => {
    const value =
      selectedAsset === null
        ? Math.max(availableBalance - 1, 0)
        : availableBalance;
    setAmount(value.toFixed(2));
  };

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
          SEND
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {`Send ${selectedAsset?.code ?? "XLM"}`}
        </Text>

        {!editingDestination && destinationValid ? (
          <Pressable
            className="mt-6 flex-row items-center rounded-[20px] bg-[#121214] px-4 py-3"
            onPress={() => setEditingDestination(true)}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#1E1E20]">
              <Text className="text-[13px] font-extrabold text-white">
                {trimmedDestination.slice(0, 2)}
              </Text>
            </View>
            <Text className="ml-3 flex-1 text-[15px] font-bold text-white">
              {`${trimmedDestination.slice(0, 6)}…${trimmedDestination.slice(-6)}`}
            </Text>
            <ChevronRight color="#77777B" size={18} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View className="mt-6 rounded-[20px] bg-[#121214] px-4 py-4">
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                placeholder="Recipient address (G...)"
                placeholderTextColor="#6E6E72"
                autoCapitalize="characters"
                autoCorrect={false}
                value={destination}
                onChangeText={setDestination}
                onBlur={() => {
                  if (destinationValid) setEditingDestination(false);
                }}
              />
              <Pressable
                className="h-12 w-12 items-center justify-center rounded-xl bg-[#1E1E20]"
                onPress={() => router.push("/payments/scan")}
              >
                <QrCode color="#FFFFFF" size={20} strokeWidth={2.25} />
              </Pressable>
            </View>
          </View>
        )}

        <View className="relative mt-4 rounded-[20px] bg-[#121214] px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">Sending</Text>
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
              className="absolute left-4 right-4 top-14 z-10 overflow-hidden rounded-xl bg-[#242426]"
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
                  <Text className="text-[12px] font-bold text-[#5BED97]">Selected</Text>
                ) : null}
              </Pressable>
              {heldAssets.map((asset) => (
                <Pressable
                  key={asset.asset.id}
                  className="flex-row items-center justify-between border-b border-[#242426] px-3 py-2.5"
                  onPress={() => {
                    setSelectedAsset({
                      code: asset.asset.code,
                      issuer: asset.asset.issuer!,
                    });
                    setAssetPickerOpen(false);
                  }}
                >
                  <Text className="text-[14px] font-bold text-white">
                    {asset.asset.code}
                  </Text>
                  {selectedAsset?.code === asset.asset.code ? (
                    <Text className="text-[12px] font-bold text-[#5BED97]">Selected</Text>
                  ) : null}
                </Pressable>
              ))}
              <Pressable
                className="px-3 py-2.5"
                onPress={() => {
                  setAssetPickerOpen(false);
                  router.push("/payments/add-asset");
                }}
              >
                <Text className="text-[14px] font-bold text-[#237BFF]">+ Add asset</Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            className="mt-2 text-[44px] font-extrabold text-white"
            placeholder="0"
            placeholderTextColor="#3A3A3C"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            onFocus={() => setAssetPickerOpen(false)}
          />
          <Text className="mt-1 text-[12px] font-semibold text-[#8E8E92]">
            {availableLabel}
          </Text>
          {showHint ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
              Enter a valid recipient address and amount.
            </Text>
          ) : null}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            className="flex-1 items-center rounded-full border border-[#303033] py-2.5"
            onPress={() => setPercentageAmount(0.25)}
          >
            <Text className="text-[13px] font-bold text-[#D8D8DC]">25%</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-full border border-[#303033] py-2.5"
            onPress={() => setPercentageAmount(0.5)}
          >
            <Text className="text-[13px] font-bold text-[#D8D8DC]">50%</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-full border border-[#303033] py-2.5"
            onPress={() => setPercentageAmount(0.75)}
          >
            <Text className="text-[13px] font-bold text-[#D8D8DC]">75%</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-full border border-[#303033] py-2.5"
            onPress={setMaxAmount}
          >
            <Text className="text-[13px] font-bold text-[#D8D8DC]">Max</Text>
          </Pressable>
        </View>

        <TextInput
          className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[14px] font-semibold text-white"
          placeholder="Memo (optional)"
          placeholderTextColor="#6E6E72"
          maxLength={28}
          value={memo}
          onChangeText={setMemo}
        />

        <Pressable
          accessibilityRole="button"
          className={`mt-4 self-start rounded-full px-4 py-2.5 ${
            formValid ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
          }`}
          disabled={!formValid}
          onPress={() =>
            router.push({
              pathname: "/payments/confirm",
              params: {
                destination: trimmedDestination,
                amount: trimmedAmount,
                ...(selectedAsset !== null
                  ? { assetCode: selectedAsset.code, assetIssuer: selectedAsset.issuer }
                  : {}),
                ...(memo.trim().length > 0 ? { memo: memo.trim() } : {}),
              },
            })
          }
        >
          <Text
            className={`text-[14px] font-bold ${
              formValid ? "text-white" : "text-white/50"
            }`}
          >
            {!amountValid ? "Enter an amount" : "Continue"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
