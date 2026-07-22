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

import { useWalletStore } from "@/src/features/wallet/state/wallet-store";
import { deviceBiometricAuthorizer } from "@/src/services/wallet/biometric-authorizer";
import { getLocalWalletErrorMessage } from "@/src/services/wallet/local-wallet-errors";
import {
  importLocalWalletMaterial,
  isValidWalletPin,
  storeLocalWalletMaterial,
} from "@/src/services/wallet/local-wallet-service";

export function ImportSelfCustodyWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accounts = useWalletStore((state) => state.accounts);
  const addAccount = useWalletStore((state) => state.addAccount);
  const [name, setName] = useState("");
  const [recovery, setRecovery] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const importWallet = async () => {
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
      const material = importLocalWalletMaterial(recovery);
      if (accounts.some((account) => account.id === material.publicKey)) {
        throw new Error("That wallet is already in your wallet list.");
      }

      await deviceBiometricAuthorizer.authorize("Import self-custody wallet");
      await storeLocalWalletMaterial(material, pin);
      addAccount({
        createdAt: new Date().toISOString(),
        custody: "non_custodial",
        id: material.publicKey,
        name: name.trim() || "Imported wallet",
        publicKey: material.publicKey,
      });
      router.replace({
        pathname: "/wallet/[accountId]",
        params: { accountId: material.publicKey },
      });
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.includes("already in")
          ? caught.message
          : getLocalWalletErrorMessage(caught)
      );
    } finally {
      setIsWorking(false);
    }
  };

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
        <Text className="mt-2 text-[30px] font-extrabold text-white">Import wallet</Text>
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
            autoCapitalize="none"
            autoCorrect={false}
            className="mt-3 min-h-28 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
            multiline
            placeholder="12/24-word recovery phrase or S… secret key"
            placeholderTextColor="#6E6E72"
            secureTextEntry
            textAlignVertical="top"
            value={recovery}
            onChangeText={setRecovery}
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
            Recovery details are encrypted on this device and never sent to Geko.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-xl bg-[#237BFF]"
            disabled={isWorking}
            onPress={() => void importWallet()}
          >
            {isWorking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-bold text-white">Import wallet</Text>
            )}
          </Pressable>
        </View>
        {error !== null ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
