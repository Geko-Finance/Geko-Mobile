import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";

import { useUpdateSigners } from "../api/multisig-mutations";
import { useMultisigAccount } from "../api/multisig-queries";

const parseThreshold = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255 ? parsed : null;
};

export function EditThresholdsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const account = useWalletAccount(accountId);
  const multisig = useMultisigAccount(account?.publicKey);
  const updateSigners = useUpdateSigners();

  const [low, setLow] = useState("");
  const [med, setMed] = useState("");
  const [high, setHigh] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (multisig.data === undefined) {
      return;
    }
    setLow(String(multisig.data.thresholds.low));
    setMed(String(multisig.data.thresholds.medium));
    setHigh(String(multisig.data.thresholds.high));
  }, [multisig.data]);

  if (account === undefined || account.custody !== "non_custodial") {
    return (
      <ScreenPlaceholder
        description="Multisig is only available for self-custody wallets on this device."
        eyebrow="Multisig"
        title="Not available"
      />
    );
  }

  const parsedLow = parseThreshold(low);
  const parsedMed = parseThreshold(med);
  const parsedHigh = parseThreshold(high);
  const canSubmit =
    session !== null &&
    multisig.data !== undefined &&
    parsedLow !== null &&
    parsedMed !== null &&
    parsedHigh !== null &&
    pin.length === 6 &&
    !updateSigners.isPending;

  const handleSubmit = async () => {
    if (
      !canSubmit ||
      session === null ||
      multisig.data === undefined ||
      parsedLow === null ||
      parsedMed === null ||
      parsedHigh === null
    ) {
      return;
    }

    setError(null);
    try {
      const outcome = await updateSigners.mutateAsync({
        account,
        multisigAccount: multisig.data,
        ownerUserId: session.user.id,
        thresholds: { low: parsedLow, med: parsedMed, high: parsedHigh },
        pinProvider: async () => pin,
      });

      setPin("");

      if (outcome.status === "submitted") {
        router.back();
        return;
      }

      router.replace({
        pathname: "/multisig/proposal/[id]",
        params: { id: outcome.proposal.id, accountId: account.id },
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to update thresholds.",
      );
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Multisig
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">Edit thresholds</Text>
        <Text className="mt-2 text-[13px] leading-5 text-[#8E8E92]">
          Higher thresholds need more combined signer weight before a transaction executes.
          Changing thresholds itself always requires the account&apos;s high threshold.
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          {(
            [
              { label: "Low", value: low, onChange: setLow },
              { label: "Medium", value: med, onChange: setMed },
              { label: "High", value: high, onChange: setHigh },
            ] as const
          ).map((field) => (
            <View key={field.label} className="mt-2 first:mt-0">
              <Text className="text-[13px] font-semibold text-[#8E8E92]">{field.label}</Text>
              <TextInput
                className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
                keyboardType="number-pad"
                placeholderTextColor="#6E6E72"
                value={field.value}
                onChangeText={field.onChange}
              />
            </View>
          ))}

          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
            Your wallet PIN
          </Text>
          <TextInput
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit wallet PIN"
            placeholderTextColor="#6E6E72"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
          />

          <Pressable
            accessibilityRole="button"
            className="mt-5 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
            onPress={() => void handleSubmit()}
          >
            {updateSigners.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-[14px] font-bold text-white">Saving…</Text>
              </View>
            ) : (
              <Text className="text-[14px] font-bold text-white">Save thresholds</Text>
            )}
          </Pressable>

          {error !== null ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">{error}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
