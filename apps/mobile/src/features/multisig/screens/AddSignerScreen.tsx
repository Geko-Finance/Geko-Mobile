import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";
import { isValidStellarAddress } from "@/src/services/api/stellar/address-validation";

import { useUpdateSigners } from "../api/multisig-mutations";
import { useMultisigAccount } from "../api/multisig-queries";

export function AddSignerScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const account = useWalletAccount(accountId);
  const multisig = useMultisigAccount(account?.publicKey);
  const updateSigners = useUpdateSigners();

  const [signerKey, setSignerKey] = useState("");
  const [weight, setWeight] = useState("1");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (account === undefined || account.custody !== "non_custodial") {
    return (
      <ScreenPlaceholder
        description="Multisig is only available for self-custody wallets on this device."
        eyebrow="Multisig"
        title="Not available"
      />
    );
  }

  const parsedWeight = Number.parseInt(weight, 10);
  const canSubmit =
    session !== null &&
    multisig.data !== undefined &&
    isValidStellarAddress(signerKey.trim()) &&
    Number.isInteger(parsedWeight) &&
    parsedWeight >= 0 &&
    parsedWeight <= 255 &&
    pin.length === 6 &&
    !updateSigners.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || session === null || multisig.data === undefined) {
      return;
    }

    setError(null);
    try {
      const outcome = await updateSigners.mutateAsync({
        account,
        multisigAccount: multisig.data,
        ownerUserId: session.user.id,
        signer: { publicKey: signerKey.trim(), weight: parsedWeight },
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
      setError(caught instanceof Error ? caught.message : "Failed to add signer.");
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
        <Text className="mt-2 text-[28px] font-extrabold text-white">Add signer</Text>
        <Text className="mt-2 text-[13px] leading-5 text-[#8E8E92]">
          Enter the co-signer&apos;s Stellar public key and how much weight their signature
          carries toward this account&apos;s thresholds.
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">Signer public key</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
            placeholder="G..."
            placeholderTextColor="#6E6E72"
            value={signerKey}
            onChangeText={setSignerKey}
          />

          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">Weight</Text>
          <TextInput
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#6E6E72"
            value={weight}
            onChangeText={setWeight}
          />

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
                <Text className="text-[14px] font-bold text-white">Adding…</Text>
              </View>
            ) : (
              <Text className="text-[14px] font-bold text-white">Add signer</Text>
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
