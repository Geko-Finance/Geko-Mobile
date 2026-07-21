import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  applySignerConfigChange,
  applySignerConfigChanges,
  wouldFreezeAccountConfig,
  wouldRiskPermanentLockout,
} from "@/src/domain/multisig";
import type { MultisigAccountConfig, SignerConfigChange } from "@/src/domain/multisig";
import { isLikelyStellarPublicKey } from "@/src/domain/wallet";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useMultisigConfig, useUpdateSignerConfig } from "@/src/features/multisig/api/multisig-queries";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";

type UpdateSignerConfigInput = Parameters<
  ReturnType<typeof useUpdateSignerConfig>["mutate"]
>[0];
type ThresholdChange = NonNullable<UpdateSignerConfigInput["thresholdChange"]>;

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

/** Parses a text input as an integer in Stellar's valid 0-255 signer-weight/threshold range, or `null` if invalid. */
function parseBoundedWeight(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 || parsed > 255 ? null : parsed;
}

export function SignerManagementScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const { data: config, isLoading, error, isError } = useMultisigConfig(account?.publicKey);
  const updateSignerConfig = useUpdateSignerConfig();

  const [newSignerKey, setNewSignerKey] = useState("");
  const [newSignerWeight, setNewSignerWeight] = useState("1");
  const [lowOverride, setLowOverride] = useState<string | null>(null);
  const [mediumOverride, setMediumOverride] = useState<string | null>(null);
  const [highOverride, setHighOverride] = useState<string | null>(null);
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

  // Threshold inputs mirror the current on-chain config until the user edits them — so they stay
  // fresh after a mutation invalidates/refetches `config`, and so leaving them untouched never
  // accidentally submits a "change" back to the same values.
  const lowValue = lowOverride ?? String(config.thresholds.low);
  const mediumValue = mediumOverride ?? String(config.thresholds.medium);
  const highValue = highOverride ?? String(config.thresholds.high);

  /** Reads the threshold inputs and returns only the fields that actually differ from `config.thresholds`, or an error message if any input is out of range. */
  const readThresholdDiff = (): { thresholds: ThresholdChange; error: string | null } => {
    const low = parseBoundedWeight(lowValue);
    const medium = parseBoundedWeight(mediumValue);
    const high = parseBoundedWeight(highValue);

    if (low === null || medium === null || high === null) {
      return { thresholds: {}, error: "Thresholds must be numbers between 0 and 255." };
    }

    const thresholds: ThresholdChange = {
      ...(low !== config.thresholds.low ? { low } : {}),
      ...(medium !== config.thresholds.medium ? { medium } : {}),
      ...(high !== config.thresholds.high ? { high } : {}),
    };

    return { thresholds, error: null };
  };

  const resetThresholdOverrides = () => {
    setLowOverride(null);
    setMediumOverride(null);
    setHighOverride(null);
  };

  /**
   * Gate every signer/threshold submission through the SAME two-tier confirmation flow, computed
   * against the RESULTING config (never the current, pre-change one):
   * - `wouldRiskPermanentLockout`: the account could become unable to sign anything at all.
   * - `wouldFreezeAccountConfig`: the account could still pay, but could never run another
   *   signer/threshold change again (including undoing this one).
   * Both require an explicit "I understand, continue" — there is no auto-proceed path.
   *
   * `onProceed` runs input-clearing side effects (resetting form fields) ONLY once the change is
   * actually being submitted — i.e. either no confirmation was needed, or the user explicitly
   * confirmed. It deliberately does NOT run just because `submitChange` was called: `Alert.alert`
   * is asynchronous, so clearing inputs unconditionally right after calling this function would
   * wipe out the user's in-progress edit the instant they tap submit, even if they go on to tap
   * Cancel on the warning dialog.
   */
  const submitChange = (
    signerChanges: UpdateSignerConfigInput["signerChanges"],
    resultingConfig: MultisigAccountConfig,
    thresholdChange: ThresholdChange | undefined,
    onProceed: () => void
  ) => {
    setValidationError(null);

    const proceed = () => {
      onProceed();
      updateSignerConfig.mutate({ account, signerChanges, thresholdChange });
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

    if (wouldFreezeAccountConfig(resultingConfig)) {
      Alert.alert(
        "You won't be able to change signers or thresholds again",
        "The remaining signers can still meet this account's low/medium thresholds, so it can still transact — but their total weight won't meet the high threshold that every future signer or threshold change requires. If you continue, this configuration becomes permanent: you won't be able to add a signer back, adjust thresholds, or undo this change.",
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
    const weight = parseBoundedWeight(newSignerWeight);

    if (!isLikelyStellarPublicKey(key)) {
      setValidationError("That doesn't look like a Stellar public key.");
      return;
    }

    if (weight === null) {
      setValidationError("Weight must be a number between 0 and 255.");
      return;
    }

    const { thresholds: thresholdDiff, error: thresholdError } = readThresholdDiff();
    if (thresholdError !== null) {
      setValidationError(thresholdError);
      return;
    }

    const hasThresholdChange = Object.keys(thresholdDiff).length > 0;
    const changes: SignerConfigChange[] = [
      { kind: "addOrUpdateSigner", publicKey: key, weight },
    ];
    if (hasThresholdChange) {
      changes.push({ kind: "setThresholds", thresholds: thresholdDiff });
    }

    // Combines the signer add and any pending threshold edit into ONE submission when both are
    // present, so an account converting to multisig never sits at an under-thresholded
    // intermediate state between two separate submissions.
    const resultingConfig = applySignerConfigChanges(config, changes);

    submitChange(
      [{ kind: "add", publicKey: key, weight }],
      resultingConfig,
      hasThresholdChange ? thresholdDiff : undefined,
      () => {
        setNewSignerKey("");
        setNewSignerWeight("1");
        if (hasThresholdChange) {
          resetThresholdOverrides();
        }
      }
    );
  };

  const handleRemoveSigner = (publicKey: string) => {
    // Defense-in-depth: the Remove button is already conditionally omitted for the master key in
    // the JSX below, but that's UI-rendering-only — this guard ensures the master key can never
    // be removed even if the row rendering changes later.
    if (publicKey === account.publicKey) {
      return;
    }

    const resultingConfig = applySignerConfigChange(config, {
      kind: "removeSigner",
      publicKey,
    });

    submitChange([{ kind: "remove", publicKey }], resultingConfig, undefined, () => {});
  };

  const handleUpdateThresholds = () => {
    const { thresholds: thresholdDiff, error: thresholdError } = readThresholdDiff();

    if (thresholdError !== null) {
      setValidationError(thresholdError);
      return;
    }

    if (Object.keys(thresholdDiff).length === 0) {
      setValidationError("No threshold changes to save.");
      return;
    }

    const resultingConfig = applySignerConfigChange(config, {
      kind: "setThresholds",
      thresholds: thresholdDiff,
    });

    submitChange([], resultingConfig, thresholdDiff, resetThresholdOverrides);
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

        <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">Thresholds</Text>

        <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            Low
          </Text>
          <TextInput
            className="mt-1 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="number-pad"
            value={lowValue}
            onChangeText={setLowOverride}
          />
          <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
            Medium
          </Text>
          <TextInput
            className="mt-1 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="number-pad"
            value={mediumValue}
            onChangeText={setMediumOverride}
          />
          <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
            High
          </Text>
          <TextInput
            className="mt-1 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="number-pad"
            value={highValue}
            onChangeText={setHighOverride}
          />

          <Text className="mt-3 text-[12px] font-semibold text-[#8E8E92]">
            Editing these before tapping &ldquo;Add signer&rdquo; below updates both together, in
            one transaction.
          </Text>

          <Pressable
            accessibilityLabel="Update thresholds"
            accessibilityRole="button"
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            disabled={updateSignerConfig.isPending}
            onPress={handleUpdateThresholds}
          >
            {updateSignerConfig.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-[14px] font-bold text-white">Update thresholds</Text>
            )}
          </Pressable>
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
