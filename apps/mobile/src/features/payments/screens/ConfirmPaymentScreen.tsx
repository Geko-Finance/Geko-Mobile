import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSendPayment } from "@/src/features/payments/api/payment-queries";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { getLocalWalletErrorMessage } from "@/src/services/wallet/local-wallet-errors";

function getFriendlyErrorMessage(error: Error | null): string | null {
  if (error === null) {
    return null;
  }

  switch (error.name) {
    case "LocalWalletError":
      return getLocalWalletErrorMessage(error);
    case "CavosProviderUnavailableError":
      return "Cavos is temporarily unavailable — please try again in a moment.";
    case "CavosSessionExpiredError":
      return "This device needs approval — enter your recovery code to continue.";
    case "ApiError":
      if (error.message.includes("op_no_trust")) {
        return "The recipient hasn't added a trustline for this asset yet — they need to add it before you can send.";
      }
      return "The network rejected this transaction. Please check the details and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function ConfirmPaymentScreen() {
  const router = useRouter();
  const { destination, amount, assetCode, assetIssuer, memo } =
    useLocalSearchParams<{
      destination: string;
      amount: string;
      assetCode?: string;
      assetIssuer?: string;
      memo?: string;
    }>();
  const activeAccount = useActiveAccount();
  const sendPayment = useSendPayment();
  const [walletPin, setWalletPin] = useState("");
  const needsPin = activeAccount?.custody === "non_custodial";
  const pinReady = !needsPin || walletPin.length === 6;

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

  const inlineError = sendPayment.isError
    ? getFriendlyErrorMessage(sendPayment.error)
    : null;

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
          CONFIRM
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Review payment
        </Text>

        <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">To</Text>
          <Text className="mt-1 text-[15px] font-bold text-white">
            {`${destination.slice(0, 6)}…${destination.slice(-6)}`}
          </Text>

          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
            Amount
          </Text>
          <Text className="mt-1 text-[15px] font-bold text-white">
            {`${amount} ${assetCode ?? "XLM"}`}
          </Text>

          {typeof memo === "string" && memo.length > 0 ? (
            <>
              <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
                Memo
              </Text>
              <Text className="mt-1 text-[15px] font-bold text-white">
                {memo}
              </Text>
            </>
          ) : null}
        </View>

        {needsPin ? (
          <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">
              Wallet PIN
            </Text>
            <Text className="mt-1 text-[13px] leading-5 text-[#8E8E92]">
              Enter your six-digit wallet PIN to sign this payment on-device.
            </Text>
            <TextInput
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit wallet PIN"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={walletPin}
              onChangeText={setWalletPin}
            />
          </View>
        ) : null}

        {inlineError ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
            {inlineError}
          </Text>
        ) : null}

        <Pressable
          className={`mt-7 self-start rounded-full px-4 py-2.5 ${
            pinReady ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
          }`}
          disabled={!pinReady || sendPayment.isPending}
          onPress={() =>
            sendPayment.mutate(
              {
                account: activeAccount,
                destinationPublicKey: destination,
                amountXlm: amount,
                ...(typeof assetCode === "string" && typeof assetIssuer === "string"
                  ? { asset: { code: assetCode, issuer: assetIssuer } }
                  : {}),
                ...(typeof memo === "string" && memo.length > 0 ? { memo } : {}),
                ...(needsPin
                  ? { pinProvider: async () => walletPin }
                  : {}),
              },
              {
                onSuccess: (result) =>
                  router.replace({
                    pathname: "/payments/success",
                    params: {
                      destination,
                      amount,
                      hash: result.hash ?? "",
                      assetCode: assetCode ?? "",
                    },
                  }),
              },
            )
          }
        >
          {sendPayment.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-[14px] font-bold text-white">Sending…</Text>
            </View>
          ) : (
            <Text
              className={`text-[14px] font-bold ${
                pinReady ? "text-white" : "text-white/50"
              }`}
            >
              Confirm & send
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
