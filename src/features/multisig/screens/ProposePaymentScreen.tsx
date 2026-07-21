import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { encodeSep7TxRequest } from "@/src/domain/payments";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import {
  useMultisigConfig,
  useProposePayment,
} from "@/src/features/multisig/api/multisig-queries";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";

export function ProposePaymentScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const { data: config } = useMultisigConfig(account?.publicKey);
  const proposePayment = useProposePayment();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [shareUri, setShareUri] = useState<string | null>(null);

  if (account === undefined || config === undefined) {
    return (
      <ScreenPlaceholder
        description="Load this account's signer configuration first."
        eyebrow="Multisig"
        title="Not ready yet"
      />
    );
  }

  const handlePropose = async () => {
    const result = await proposePayment.mutateAsync({
      account,
      config,
      destination: destination.trim(),
      amount: amount.trim(),
    });

    if (result.submitted) {
      router.replace("/payments/success");
      return;
    }

    setShareUri(
      encodeSep7TxRequest({
        kind: "tx",
        xdr: result.envelopeXdr,
        networkPassphrase: result.networkPassphrase,
      })
    );
  };

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
          Multisig
        </Text>
        <Text className="mt-2 w-full text-[32px] font-extrabold text-white">
          Propose payment
        </Text>

        {shareUri === null ? (
          <View className="mt-6 w-full overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
            <TextInput
              autoCapitalize="characters"
              className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              placeholder="Destination G… address"
              placeholderTextColor="#6E6E72"
              value={destination}
              onChangeText={setDestination}
            />
            <TextInput
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor="#6E6E72"
              value={amount}
              onChangeText={setAmount}
            />

            {proposePayment.isError ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                {proposePayment.error.message}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="Propose payment"
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#5BED97] px-4 py-2.5"
              disabled={proposePayment.isPending}
              onPress={() => {
                void handlePropose();
              }}
            >
              {proposePayment.isPending ? (
                <ActivityIndicator color="#123B2B" size="small" />
              ) : (
                <Text className="text-[14px] font-extrabold text-[#123B2B]">
                  Propose
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 items-center rounded-[20px] bg-white p-5">
            <QRCode backgroundColor="white" color="black" size={220} value={shareUri} />
            <Text className="mt-4 max-w-[240px] text-center text-[13px] font-semibold text-black">
              This threshold hasn&apos;t been met yet. Share this with a co-signer to collect
              the next signature.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
