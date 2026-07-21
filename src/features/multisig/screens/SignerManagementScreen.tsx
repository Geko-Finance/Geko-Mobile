import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { wouldRiskPermanentLockout } from "@/src/domain/multisig";
import type { MultisigAccountConfig } from "@/src/domain/multisig";
import { isLikelyStellarPublicKey } from "@/src/domain/wallet";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useMultisigConfig, useUpdateSignerConfig } from "@/src/features/multisig/api/multisig-queries";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

export function SignerManagementScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const { data: config, isLoading, error, isError } = useMultisigConfig(account?.publicKey);
  const updateSignerConfig = useUpdateSignerConfig();

  const [newSignerKey, setNewSignerKey] = useState("");
  const [newSignerWeight, setNewSignerWeight] = useState("1");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (account === undefined) {
    return (
      <ScreenPlaceholder
        description="This account is not in your wallet."
        eyebrow="Multisig"
        title="Account not found"
      />
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (isError || config === undefined) {
    return (
      <ScreenPlaceholder
        description={error?.message ?? "Unable to load signer configuration."}
        eyebrow="Multisig"
        title="Couldn't load signers"
      />
    );
  }

  const inlineError = validationError ?? (updateSignerConfig.isError ? updateSignerConfig.error.message : null);

  const submitChange = (
    signerChanges: Parameters<typeof updateSignerConfig.mutate>[0]["signerChanges"],
    resultingConfig: MultisigAccountConfig
  ) => {
    setValidationError(null);

    const proceed = () => {
      updateSignerConfig.mutate({ account, signerChanges });
    };

    if (wouldRiskPermanentLockout(resultingConfig)) {
      Alert.alert(
        "This could permanently lock this account",
        "The remaining signers won't have enough total weight to meet this account's own low threshold. If you continue, this account may become permanently unable to sign anything, including undoing this change.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "I understand, continue", style: "destructive", onPress: proceed },
        ]
      );
      return;
    }

    proceed();
  };

  const handleAddSigner = () => {
    const key = newSignerKey.trim();
    const weight = Number.parseInt(newSignerWeight, 10);

    if (!isLikelyStellarPublicKey(key)) {
      setValidationError("That doesn't look like a Stellar public key.");
      return;
    }

    if (Number.isNaN(weight) || weight < 0) {
      setValidationError("Weight must be a non-negative number.");
      return;
    }

    const resultingConfig: MultisigAccountConfig = {
      ...config,
      signers: [...config.signers, { publicKey: key, weight }],
    };

    submitChange([{ kind: "add", publicKey: key, weight }], resultingConfig);
    setNewSignerKey("");
  };

  const handleRemoveSigner = (publicKey: string) => {
    const resultingConfig: MultisigAccountConfig = {
      ...config,
      signers: config.signers.filter((signer) => signer.publicKey !== publicKey),
    };

    submitChange([{ kind: "remove", publicKey }], resultingConfig);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Multisig
        </Text>
        <Text className="mt-2 text-[32px] font-extrabold text-white">Signers</Text>

        <Text className="mb-3 mt-6 text-[15px] font-bold text-[#8E8E92]">
          Thresholds: low {config.thresholds.low} · medium {config.thresholds.medium} · high{" "}
          {config.thresholds.high}
        </Text>

        <View className="overflow-hidden rounded-[20px] bg-[#121214]">
          {config.signers.map((signer, index) => {
            const isMasterKey = signer.publicKey === account.publicKey;

            return (
              <View
                key={signer.publicKey}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index < config.signers.length - 1 ? "border-b border-[#1E1E20]" : ""
                }`}
              >
                <View>
                  <Text className="text-[15px] font-bold text-white">
                    {formatPublicKey(signer.publicKey)}
                    {isMasterKey ? " (this account)" : ""}
                  </Text>
                  <Text className="mt-0.5 text-[13px] font-semibold text-[#8E8E92]">
                    Weight {signer.weight}
                  </Text>
                </View>
                {!isMasterKey ? (
                  <Pressable
                    accessibilityLabel={`Remove signer ${formatPublicKey(signer.publicKey)}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleRemoveSigner(signer.publicKey)}
                  >
                    <Text className="text-[13px] font-bold text-[#FF6B6B]">Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">Add signer</Text>

        <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <TextInput
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="G… public key"
            placeholderTextColor="#6E6E72"
            value={newSignerKey}
            onChangeText={setNewSignerKey}
          />
          <TextInput
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="number-pad"
            placeholder="Weight"
            placeholderTextColor="#6E6E72"
            value={newSignerWeight}
            onChangeText={setNewSignerWeight}
          />

          {inlineError !== null ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">{inlineError}</Text>
          ) : null}

          <Pressable
            accessibilityLabel="Add signer"
            accessibilityRole="button"
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            disabled={updateSignerConfig.isPending}
            onPress={handleAddSigner}
          >
            {updateSignerConfig.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-[14px] font-bold text-white">Add signer</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
