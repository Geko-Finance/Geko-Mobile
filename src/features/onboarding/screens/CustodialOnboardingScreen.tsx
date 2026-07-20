import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCreateCustodialWallet,
  useRecoverCustodialWallet,
} from "@/src/features/wallet/api/wallet-queries";

type OnboardingMode = "create" | "recover";

function getFriendlyErrorMessage(error: Error | null): string | null {
  if (error === null) {
    return null;
  }

  switch (error.name) {
    case "CavosProviderUnavailableError":
      return "Cavos is temporarily unavailable — please try again in a moment.";
    case "CavosSessionExpiredError":
      return "Your session has expired — please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function CustodialOnboardingScreen() {
  const router = useRouter();
  const createCustodialWallet = useCreateCustodialWallet();
  const recoverCustodialWallet = useRecoverCustodialWallet();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<OnboardingMode>("create");

  const activeMutation =
    mode === "create" ? createCustodialWallet : recoverCustodialWallet;
  const inlineError = activeMutation.isError
    ? getFriendlyErrorMessage(activeMutation.error)
    : null;
  const isSubmitDisabled = email.trim().length === 0 || activeMutation.isPending;

  const handleSubmit = () => {
    const identity = {
      userId: email.trim(),
      email: email.trim(),
    };

    if (mode === "create") {
      createCustodialWallet.mutate(
        { identity, name },
        { onSuccess: () => router.replace("/wallet") }
      );
      return;
    }

    recoverCustodialWallet.mutate(
      { identity },
      { onSuccess: () => router.replace("/wallet") }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          ONBOARDING
        </Text>

        <Text className="mt-2 text-[28px] font-extrabold leading-[34px] text-white">
          Create a wallet — no seed phrase needed
        </Text>

        <Text className="mt-3 text-[15px] font-semibold leading-[22px] text-[#8E8E92]">
          Geko can create a Stellar wallet for you and keep the keys secure with
          Cavos. Sign in with your email to create a new wallet or recover one
          you already have — no secret phrase to write down.
        </Text>

        <View className="mt-6 flex-row rounded-full bg-[#1E1E20] p-1">
          <Pressable
            accessibilityRole="button"
            className={`flex-1 items-center rounded-full px-3 py-2.5 ${
              mode === "create" ? "bg-[#242426]" : ""
            }`}
            onPress={() => setMode("create")}
          >
            <Text
              className={`text-[13px] font-bold ${
                mode === "create" ? "text-white" : "text-[#8E8E92]"
              }`}
            >
              Create wallet
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className={`flex-1 items-center rounded-full px-3 py-2.5 ${
              mode === "recover" ? "bg-[#242426]" : ""
            }`}
            onPress={() => setMode("recover")}
          >
            <Text
              className={`text-[13px] font-bold ${
                mode === "recover" ? "text-white" : "text-[#8E8E92]"
              }`}
            >
              I already have a wallet
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#6E6E72"
            value={email}
            onChangeText={setEmail}
          />

          {mode === "create" ? (
            <TextInput
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect={false}
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              placeholder="Wallet name (optional)"
              placeholderTextColor="#6E6E72"
              value={name}
              onChangeText={setName}
            />
          ) : null}

          {inlineError !== null ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
              {inlineError}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel={
              mode === "create" ? "Create wallet" : "Recover wallet"
            }
            accessibilityRole="button"
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            disabled={isSubmitDisabled}
            onPress={handleSubmit}
          >
            {activeMutation.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-[14px] font-bold text-white">
                  {mode === "create" ? "Creating…" : "Recovering…"}
                </Text>
              </View>
            ) : (
              <Text className="text-[14px] font-bold text-white">
                {mode === "create" ? "Create wallet" : "Recover wallet"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
