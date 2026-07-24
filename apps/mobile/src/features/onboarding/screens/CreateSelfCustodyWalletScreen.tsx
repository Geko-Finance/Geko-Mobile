import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { fundTestnetAccount } from "@/src/services/api/stellar/friendbot";
import { deviceBiometricAuthorizer } from "@/src/services/wallet/biometric-authorizer";
import {
  generateLocalWalletMaterial,
  isValidWalletPin,
  storeLocalWalletMaterial,
  type LocalWalletMaterial,
} from "@/src/services/wallet/local-wallet-service";
import {
  getLocalWalletErrorMessage,
  LocalWalletError,
} from "@/src/services/wallet/local-wallet-errors";
import { registerNonCustodialWallet } from "@/src/services/wallet/register-non-custodial-wallet";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useWalletStore } from "@/src/features/wallet/state/wallet-store";

const VERIFY_WORD_INDEXES = [2, 6, 10] as const;

export function CreateSelfCustodyWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const networkId = useActiveNetworkId();
  const addAccount = useWalletStore((state) => state.addAccount);
  const accounts = useWalletStore((state) => state.accounts);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [material, setMaterial] = useState<LocalWalletMaterial | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const startBackup = async () => {
    setError(null);

    if (!isValidWalletPin(pin)) {
      setError("Choose a wallet PIN containing exactly six digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("The wallet PINs do not match.");
      return;
    }

    setIsWorking(true);
    try {
      await deviceBiometricAuthorizer.authorize("Create self-custody wallet");
      const nextMaterial = generateLocalWalletMaterial();

      if (accounts.some((account) => account.id === nextMaterial.publicKey)) {
        throw new Error("Generated wallet already exists. Please try again.");
      }

      setMaterial(nextMaterial);
    } catch (caught) {
      setError(getLocalWalletErrorMessage(caught));
    } finally {
      setIsWorking(false);
    }
  };

  const finishBackup = async () => {
    if (material === null || session === null) {
      return;
    }

    const words = material.recoveryValue.split(" ");
    const isCorrect = VERIFY_WORD_INDEXES.every(
      (index) => answers[index]?.trim().toLowerCase() === words[index]
    );

    if (!isCorrect) {
      setError("One or more recovery words are incorrect. Check your backup.");
      return;
    }

    setError(null);
    setIsWorking(true);
    try {
      try {
        await storeLocalWalletMaterial(material, pin);
      } catch (caught) {
        // Keys may already be on-device from a prior attempt that failed at backend sync.
        if (
          !(caught instanceof LocalWalletError && caught.code === "DUPLICATE_WALLET")
        ) {
          throw caught;
        }
      }
      await registerNonCustodialWallet(material.publicKey);
      if (!accounts.some((account) => account.id === material.publicKey)) {
        addAccount({
          createdAt: new Date().toISOString(),
          custody: "non_custodial",
          id: material.publicKey,
          name: name.trim() || "My wallet",
          ownerUserId: session.user.id,
          publicKey: material.publicKey,
        });
      }

      let fundingFailed = false;
      if (networkId === "testnet") {
        try {
          await fundTestnetAccount(material.publicKey, networkId);
        } catch {
          fundingFailed = true;
        }
      }

      router.replace({
        pathname: "/wallet/[accountId]",
        params: {
          accountId: material.publicKey,
          ...(fundingFailed ? { funding: "failed" } : {}),
        },
      });
    } catch (caught) {
      setError(getLocalWalletErrorMessage(caught));
    } finally {
      setIsWorking(false);
    }
  };

  const words = material?.recoveryValue.split(" ") ?? [];

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerClassName="px-5 pb-12"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="text-[15px] font-bold text-[#5BED97]">Back</Text>
        </Pressable>
        <Text className="mt-5 text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          SELF-CUSTODY
        </Text>
        <Text className="mt-2 text-[30px] font-extrabold text-white">
          {material === null ? "Create wallet" : "Back up your wallet"}
        </Text>

        {material === null ? (
          <View className="mt-6 rounded-[20px] bg-[#121214] p-4">
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              className="rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
              placeholder="Wallet name"
              placeholderTextColor="#6E6E72"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit wallet PIN"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
            />
            <TextInput
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Confirm wallet PIN"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
            <Text className="mt-3 text-[13px] leading-5 text-[#8E8E92]">
              Your PIN is never stored. You will need it together with device biometrics to sign or reveal recovery details.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-xl bg-[#237BFF]"
              disabled={isWorking}
              onPress={() => void startBackup()}
            >
              {isWorking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-bold text-white">Generate wallet</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mt-6 rounded-[20px] bg-[#121214] p-4">
              <Text className="text-[14px] font-bold text-[#FFCC66]">
                Write these words down in order. Never share them.
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {words.map((word, index) => (
                  <View key={`${index}-${word}`} className="w-[30%] rounded-lg bg-[#1E1E20] px-2 py-2">
                    <Text className="text-[12px] text-[#8E8E92]">{index + 1}</Text>
                    <Text className="mt-0.5 font-bold text-white">{word}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="mt-4 rounded-[20px] bg-[#121214] p-4">
              <Text className="text-[16px] font-bold text-white">Verify your backup</Text>
              {VERIFY_WORD_INDEXES.map((index) => (
                <TextInput
                  key={index}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
                  placeholder={`Word ${index + 1}`}
                  placeholderTextColor="#6E6E72"
                  value={answers[index] ?? ""}
                  onChangeText={(value) =>
                    setAnswers((current) => ({ ...current, [index]: value }))
                  }
                />
              ))}
              <Pressable
                accessibilityRole="button"
                className="mt-5 min-h-12 items-center justify-center rounded-xl bg-[#237BFF]"
                disabled={isWorking}
                onPress={() => void finishBackup()}
              >
                {isWorking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-bold text-white">Verify and save</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {error !== null ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
