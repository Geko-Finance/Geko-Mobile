import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { encodeSep7PayRequest } from "@/src/domain/payments";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

export function ReceivePaymentScreen() {
  const account = useActiveAccount();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  if (account === null) {
    return (
      <ScreenPlaceholder
        description="Create or select a wallet before generating a payment request."
        eyebrow="Payments"
        title="No active wallet"
      />
    );
  }

  const uri = encodeSep7PayRequest({
    kind: "pay",
    destination: account.publicKey,
    amount: amount.trim() === "" ? undefined : amount.trim(),
    memo: memo.trim() === "" ? undefined : memo.trim(),
  });

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="items-center px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="w-full text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Payments
        </Text>
        <Text className="mt-2 w-full text-[32px] font-extrabold text-white">
          Receive
        </Text>

        <View className="mt-6 items-center rounded-[20px] bg-white p-5">
          <QRCode backgroundColor="white" color="black" size={220} value={uri} />
        </View>

        <Text className="mt-4 text-center text-[13px] font-semibold text-[#8E8E92]">
          {account.name} ·{" "}
          {`${account.publicKey.slice(0, 4)}…${account.publicKey.slice(-4)}`}
        </Text>

        <View className="mt-6 w-full overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            Amount (optional)
          </Text>
          <TextInput
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#6E6E72"
            value={amount}
            onChangeText={setAmount}
          />

          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
            Memo (optional)
          </Text>
          <TextInput
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="What's this for?"
            placeholderTextColor="#6E6E72"
            value={memo}
            onChangeText={setMemo}
          />
        </View>
      </ScrollView>
    </View>
  );
}
